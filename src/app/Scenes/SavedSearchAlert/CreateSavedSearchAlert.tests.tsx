import { fireEvent, waitFor } from "@testing-library/react-native"
import { FilterData, FilterParamName } from "app/Components/ArtworkFilter/ArtworkFilterHelpers"
import {
  ArtworkFiltersState,
  ArtworkFiltersStoreProvider,
} from "app/Components/ArtworkFilter/ArtworkFilterStore"
import { defaultEnvironment } from "app/relay/createEnvironment"
import { __globalStoreTestUtils__ } from "app/store/GlobalStore"
import { mockEnvironmentPayload } from "app/tests/mockEnvironmentPayload"
import { mockFetchNotificationPermissions } from "app/tests/mockFetchNotificationPermissions"
import { renderWithWrappersTL } from "app/tests/renderWithWrappers"
import { PushAuthorizationStatus } from "app/utils/PushNotification"
import React from "react"
import { createMockEnvironment } from "relay-test-utils"
import { MockResolvers } from "relay-test-utils/lib/RelayMockPayloadGenerator"
import { CreateSavedSearchAlert } from "./CreateSavedSearchAlert"
import { CreateSavedSearchAlertParams } from "./SavedSearchAlertModel"

jest.unmock("react-relay")

const filters: FilterData[] = [
  {
    displayText: "Bid",
    paramName: FilterParamName.waysToBuyBid,
    paramValue: true,
  },
  {
    displayText: "Open Edition",
    paramName: FilterParamName.attributionClass,
    paramValue: ["open edition"],
  },
]

const initialData: ArtworkFiltersState = {
  selectedFilters: [],
  appliedFilters: filters,
  previouslyAppliedFilters: filters,
  applyFilters: false,
  aggregations: [],
  filterType: "artwork",
  counts: {
    total: null,
    followedArtists: null,
  },
  sizeMetric: "cm",
}

const defaultParams: CreateSavedSearchAlertParams = {
  artistId: "artistID",
  artistName: "artistName",
  onComplete: jest.fn(),
  onClosePress: jest.fn(),
}

describe("CreateSavedSearchAlert", () => {
  const mockEnvironment = defaultEnvironment as ReturnType<typeof createMockEnvironment>
  const notificationPermissions = mockFetchNotificationPermissions(false)

  beforeEach(() => {
    mockEnvironment.mockClear()
    notificationPermissions.mockClear()
  })

  const TestRenderer = (params: Partial<CreateSavedSearchAlertParams>) => {
    return (
      <ArtworkFiltersStoreProvider initialData={initialData}>
        <CreateSavedSearchAlert visible params={{ ...defaultParams, ...params }} />
      </ArtworkFiltersStoreProvider>
    )
  }

  const setStatusForPushNotifications = (status: PushAuthorizationStatus) => {
    notificationPermissions.mockImplementation((cb) => {
      cb(null, status)
    })
  }

  const mockOperationByName = async (operationName: string, mockResolvers: MockResolvers) => {
    await waitFor(() => {
      const operation = mockEnvironment.mock.getMostRecentOperation()

      if (operation.fragment.node.name !== operationName) {
        throw new Error("Failed")
      }
    })

    mockEnvironmentPayload(mockEnvironment, mockResolvers)
  }

  it("renders without throwing an error", async () => {
    const { getByText } = renderWithWrappersTL(<TestRenderer />)

    mockEnvironmentPayload(mockEnvironment)

    expect(getByText("Bid")).toBeTruthy()
    expect(getByText("Open Edition")).toBeTruthy()
  })

  it("should call onClosePress handler when the close button is pressed", () => {
    const onClosePressMock = jest.fn()
    const { getByTestId } = renderWithWrappersTL(<TestRenderer onClosePress={onClosePressMock} />)

    mockEnvironmentPayload(mockEnvironment)
    fireEvent.press(getByTestId("fancy-modal-header-left-button"))

    expect(onClosePressMock).toBeCalled()
  })

  it("calls onComplete when alert was saved", async () => {
    const onCompleteMock = jest.fn()

    setStatusForPushNotifications(PushAuthorizationStatus.Authorized)
    const { getByTestId, getAllByText } = renderWithWrappersTL(
      <TestRenderer onComplete={onCompleteMock} />
    )

    mockEnvironmentPayload(mockEnvironment)

    fireEvent.changeText(getByTestId("alert-input-name"), "something new")
    fireEvent.press(getAllByText("Save Alert")[1])

    // Check alert duplicate
    await mockOperationByName("getSavedSearchIdByCriteriaQuery", {
      Me: () => ({
        savedSearch: null,
      }),
    })

    // Update alert
    await mockOperationByName("createSavedSearchAlertMutation", {
      SearchCriteria: () => ({
        internalID: "internalID",
      }),
    })

    await waitFor(() =>
      expect(onCompleteMock).toHaveBeenCalledWith({
        id: "internalID",
      })
    )
  })

  describe("Notification toggles", () => {
    it("email toggle is disabled by enabled if the user has allowed email notifications", async () => {
      setStatusForPushNotifications(PushAuthorizationStatus.Authorized)
      const { findAllByA11yState } = renderWithWrappersTL(<TestRenderer />)

      mockEnvironmentPayload(mockEnvironment, {
        Me: () => ({
          emailFrequency: "alerts_only",
        }),
      })

      const toggles = await findAllByA11yState({ selected: true })
      expect(toggles).toHaveLength(2)
    })

    it("email toggle is disabled by default if the user has not allowed email notifications", async () => {
      setStatusForPushNotifications(PushAuthorizationStatus.Authorized)
      const { findAllByA11yState } = renderWithWrappersTL(<TestRenderer />)

      mockEnvironmentPayload(mockEnvironment, {
        Me: () => ({
          emailFrequency: "none",
        }),
      })

      const toggles = await findAllByA11yState({ selected: false })
      expect(toggles).toHaveLength(1)
    })

    it("push toggle is enabled by default when push permissions are enabled", async () => {
      setStatusForPushNotifications(PushAuthorizationStatus.Authorized)
      const { findAllByA11yState } = renderWithWrappersTL(<TestRenderer />)
      const toggles = await findAllByA11yState({ selected: true })

      expect(toggles).toHaveLength(2)
    })

    it("push toggle is disabled by default when push permissions are denied", async () => {
      setStatusForPushNotifications(PushAuthorizationStatus.Denied)
      const { findAllByA11yState } = renderWithWrappersTL(<TestRenderer />)
      const toggles = await findAllByA11yState({ selected: false })

      expect(toggles).toHaveLength(1)
    })

    it("push toggle is disabled by default when push permissions are not determined", async () => {
      setStatusForPushNotifications(PushAuthorizationStatus.NotDetermined)
      const { findAllByA11yState } = renderWithWrappersTL(<TestRenderer />)
      const toggles = await findAllByA11yState({ selected: false })

      expect(toggles).toHaveLength(1)
    })
  })
})
