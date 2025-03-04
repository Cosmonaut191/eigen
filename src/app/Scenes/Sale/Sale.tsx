import { ContextModule, OwnerType } from "@artsy/cohesion"
import { captureMessage } from "@sentry/react-native"
import { Sale_me } from "__generated__/Sale_me.graphql"
import { Sale_sale } from "__generated__/Sale_sale.graphql"
import { SaleAboveTheFoldQuery } from "__generated__/SaleAboveTheFoldQuery.graphql"
import { SaleBelowTheFoldQuery } from "__generated__/SaleBelowTheFoldQuery.graphql"
import {
  AnimatedArtworkFilterButton,
  ArtworkFilterNavigator,
  FilterModalMode,
} from "app/Components/ArtworkFilter"
import { ArtworkFiltersStoreProvider } from "app/Components/ArtworkFilter/ArtworkFilterStore"
import { LoadFailureView } from "app/Components/LoadFailureView"
import { RetryErrorBoundaryLegacy } from "app/Components/RetryErrorBoundary"
import Spinner from "app/Components/Spinner"
import { navigate, popParentViewController } from "app/navigation/navigate"
import { defaultEnvironment } from "app/relay/createEnvironment"
import { unsafe__getEnvironment } from "app/store/GlobalStore"
import { AboveTheFoldQueryRenderer } from "app/utils/AboveTheFoldQueryRenderer"
import { PlaceholderBox, PlaceholderText, ProvidePlaceholderContext } from "app/utils/placeholders"
import { ProvideScreenTracking, Schema } from "app/utils/track"
import _, { times } from "lodash"
import { DateTime } from "luxon"
import { Box, Flex, Join, Spacer } from "palette"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { Animated, FlatList, RefreshControl } from "react-native"
import { createRefetchContainer, graphql, RelayRefetchProp } from "react-relay"
import { useTracking } from "react-tracking"
import useInterval from "react-use/lib/useInterval"
import usePrevious from "react-use/lib/usePrevious"
import RelayModernEnvironment from "relay-runtime/lib/store/RelayModernEnvironment"
import { SaleBelowTheFoldQueryResponse } from "../../../__generated__/SaleBelowTheFoldQuery.graphql"
import { CascadingEndTimesBanner } from "../Artwork/Components/CascadingEndTimesBanner"
import { BuyNowArtworksRailContainer } from "./Components/BuyNowArtworksRail"
import { RegisterToBidButtonContainer } from "./Components/RegisterToBidButton"
import { SaleActiveBidsContainer } from "./Components/SaleActiveBids"
import { SaleArtworksRailContainer } from "./Components/SaleArtworksRail"
import { COVER_IMAGE_HEIGHT, SaleHeaderContainer as SaleHeader } from "./Components/SaleHeader"
import { SaleLotsListContainer } from "./Components/SaleLotsList"
import { saleStatus } from "./helpers"

interface Props {
  relay: RelayRefetchProp
  me: Sale_me
  sale: Sale_sale
  below: SaleBelowTheFoldQueryResponse
}

interface SaleSection {
  key: string
  content: JSX.Element
}

const SALE_HEADER = "header"
const SALE_REGISTER_TO_BID = "registerToBid"
const SALE_CASCADING_END_TIMES_BANNER = "cascadingEndTimesBanner"
const SALE_ACTIVE_BIDS = "saleActiveBids"
const SALE_ARTWORKS_RAIL = "saleArtworksRail"
const BUY_NOW_ARTWORKS_RAIL = "buyNowArtworksRail"
const SALE_LOTS_LIST = "saleLotsList"

// Types related to showing filter button on scroll
export interface ViewableItems {
  viewableItems?: ViewToken[]
}

interface ViewToken {
  item?: SaleSection
  key?: string
  index?: number | null
  isViewable?: boolean
  section?: any
}

// tslint:disable-next-line:no-empty
const NOOP = () => {}

export const Sale: React.FC<Props> = ({ sale, me, below, relay }) => {
  const tracking = useTracking()

  const flatListRef = useRef<FlatList<any>>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isArtworksGridVisible, setArtworksGridVisible] = useState(false)
  const [isFilterArtworksModalVisible, setFilterArtworkModalVisible] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const prevIsLive = usePrevious(isLive)

  const scrollAnim = useRef(new Animated.Value(0)).current
  const artworksRefetchRef = useRef(NOOP)

  const onRefresh = useCallback(() => {
    setIsRefreshing(true)

    artworksRefetchRef.current()
    relay.refetch(
      {},
      null,
      () => {
        setIsRefreshing(false)
      },
      { force: true }
    )
  }, [])

  // poll every .5 seconds to check if sale has gone live
  useInterval(() => {
    if (sale.liveStartAt === null) {
      setIsLive(false)
      return
    }
    const now = DateTime.now()
    if (now > DateTime.fromISO(sale.liveStartAt)) {
      if (sale.endAt === null) {
        setIsLive(true)
        return
      }
      if (now < DateTime.fromISO(sale.endAt)) {
        setIsLive(true)
        return
      }
      setIsLive(false)
      return
    }
    setIsLive(false)
    return
  }, 500)

  useEffect(() => {
    if (isLive === true && prevIsLive === false) {
      switchToLive()
    }
  }, [isLive, prevIsLive])

  const switchToLive = () => {
    const liveBaseURL = unsafe__getEnvironment().predictionURL
    const liveAuctionURL = `${liveBaseURL}/${sale.slug}`
    navigate(liveAuctionURL)
    setTimeout(popParentViewController, 500)
  }

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 30 })
  const viewableItemsChangedRef = React.useRef(({ viewableItems }: ViewableItems) => {
    const artworksItem = (viewableItems! ?? []).find((viewableItem: ViewToken) => {
      return viewableItem?.item?.key === "saleLotsList"
    })
    setArtworksGridVisible(artworksItem?.isViewable ?? false)
  })

  const openFilterArtworksModal = () => {
    tracking.trackEvent(tracks.openFilter(sale.internalID, sale.slug))
    setFilterArtworkModalVisible(true)
  }

  const closeFilterArtworksModal = () => {
    tracking.trackEvent(tracks.closeFilter(sale.internalID, sale.slug))
    setFilterArtworkModalVisible(false)
  }

  const scrollToTop = () => {
    const saleLotsListIndex = saleSectionsData.findIndex(
      (section) => section.key === SALE_LOTS_LIST
    )
    flatListRef.current?.scrollToIndex({ index: saleLotsListIndex, viewOffset: 50 })
  }

  const saleSectionsData: SaleSection[] = _.compact([
    {
      key: SALE_HEADER,
      content: <SaleHeader sale={sale} scrollAnim={scrollAnim} />,
    },
    saleStatus(sale.startAt, sale.endAt, sale.registrationEndsAt) !== "closed" && {
      key: SALE_REGISTER_TO_BID,
      content: (
        <Flex mx="2" mt={2}>
          <RegisterToBidButtonContainer
            sale={sale}
            me={me}
            contextType={OwnerType.sale}
            contextModule={ContextModule.auctionHome}
          />
        </Flex>
      ),
    },
    sale.cascadingEndTimeIntervalMinutes &&
      !sale.isClosed && {
        key: SALE_CASCADING_END_TIMES_BANNER,
        content: (
          <CascadingEndTimesBanner
            cascadingEndTimeInterval={sale.cascadingEndTimeIntervalMinutes}
          />
        ),
      },
    {
      key: SALE_ACTIVE_BIDS,
      content: <SaleActiveBidsContainer me={me} saleID={sale.internalID} />,
    },
    {
      key: SALE_ARTWORKS_RAIL,
      content: <SaleArtworksRailContainer me={me} />,
    },
    {
      key: BUY_NOW_ARTWORKS_RAIL,
      content: <BuyNowArtworksRailContainer sale={sale} />,
    },
    {
      key: SALE_LOTS_LIST,
      content: below ? (
        <SaleLotsListContainer
          saleArtworksConnection={below}
          unfilteredSaleArtworksConnection={below.unfilteredSaleArtworksConnection}
          saleID={sale.internalID}
          saleSlug={sale.slug}
          scrollToTop={scrollToTop}
          artworksRefetchRef={artworksRefetchRef}
        />
      ) : (
        // Since most likely this part of the screen will be already loaded when the user
        // reaches it, there is no need to create the fancy placeholders here
        <Flex justifyContent="center" alignItems="center" height={200}>
          <Spinner />
        </Flex>
      ),
    },
  ])

  return (
    <ArtworkFiltersStoreProvider>
      <ProvideScreenTracking info={tracks.screen(sale.internalID, sale.slug)}>
        <Animated.FlatList
          ref={flatListRef}
          data={saleSectionsData}
          viewabilityConfig={viewConfigRef.current}
          onViewableItemsChanged={viewableItemsChangedRef.current}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }: { item: SaleSection }) => item.content}
          keyExtractor={(item: SaleSection) => item.key}
          onScroll={Animated.event(
            [
              {
                nativeEvent: {
                  contentOffset: { y: scrollAnim },
                },
              },
            ],
            {
              useNativeDriver: true,
            }
          )}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          scrollEventThrottle={16}
        />
        <ArtworkFilterNavigator
          visible={isFilterArtworksModalVisible}
          id={sale.internalID}
          slug={sale.slug}
          mode={FilterModalMode.SaleArtworks}
          exitModal={closeFilterArtworksModal}
          closeModal={closeFilterArtworksModal}
        />
        <AnimatedArtworkFilterButton
          isVisible={isArtworksGridVisible}
          onPress={openFilterArtworksModal}
        />
      </ProvideScreenTracking>
    </ArtworkFiltersStoreProvider>
  )
}

export const tracks = {
  screen: (id: string, slug: string) => {
    return {
      context_screen: Schema.PageNames.Auction,
      context_screen_owner_type: Schema.OwnerEntityTypes.Auction,
      context_screen_owner_id: id,
      context_screen_owner_slug: slug,
    }
  },
  pageView: (slug: string) => {
    return {
      auction_slug: slug,
      name: "Auction Screenview",
    }
  },
  openFilter: (id: string, slug: string) => {
    return {
      action_name: "filter",
      context_screen_owner_type: Schema.OwnerEntityTypes.Auction,
      context_screen: Schema.PageNames.Auction,
      context_screen_owner_id: id,
      context_screen_owner_slug: slug,
      action_type: Schema.ActionTypes.Tap,
    }
  },
  closeFilter: (id: string, slug: string) => {
    return {
      action_name: "closeFilterWindow",
      context_screen_owner_type: Schema.OwnerEntityTypes.Auction,
      context_screen: Schema.PageNames.Auction,
      context_screen_owner_id: id,
      context_screen_owner_slug: slug,
      action_type: Schema.ActionTypes.Tap,
    }
  },
}

export const SalePlaceholder: React.FC<{}> = () => (
  <ProvidePlaceholderContext>
    <PlaceholderBox height={COVER_IMAGE_HEIGHT} width="100%" />
    <Flex px={2}>
      <Join separator={<Spacer my={2} />}>
        <Box>
          <PlaceholderText width={200 + Math.random() * 100} marginTop={20} />
          <PlaceholderText width={200 + Math.random() * 100} marginTop={20} />
          <PlaceholderText width={100 + Math.random() * 100} marginTop={5} />
        </Box>
        <Box>
          <PlaceholderText height={20} width={100 + Math.random() * 100} marginBottom={20} />
          <PlaceholderBox height={50} width="100%" />
        </Box>
        <Box>
          <PlaceholderText height={20} width={100 + Math.random() * 100} marginBottom={5} />
          <Flex flexDirection="row" py={2}>
            {times(3).map((index: number) => (
              <Flex key={index} marginRight={1}>
                <PlaceholderBox height={120} width={120} />
                <PlaceholderText marginTop={20} key={index} width={40 + Math.random() * 80} />
              </Flex>
            ))}
          </Flex>
        </Box>
      </Join>
    </Flex>
  </ProvidePlaceholderContext>
)

export const SaleContainer = createRefetchContainer(
  Sale,
  {
    me: graphql`
      fragment Sale_me on Me {
        ...SaleArtworksRail_me @arguments(saleID: $saleSlug)
        ...SaleActiveBids_me @arguments(saleID: $saleID)
        ...RegisterToBidButton_me @arguments(saleID: $saleID)
      }
    `,
    sale: graphql`
      fragment Sale_sale on Sale {
        ...SaleHeader_sale
        ...RegisterToBidButton_sale
        ...BuyNowArtworksRail_sale
        endAt
        internalID
        liveStartAt
        startAt
        registrationEndsAt
        slug
        cascadingEndTimeIntervalMinutes
        isClosed
      }
    `,
  },
  graphql`
    query SaleRefetchQuery($saleID: String!, $saleSlug: ID!) {
      me @optionalField {
        ...Sale_me
      }
      sale(id: $saleID) {
        ...Sale_sale
      }
    }
  `
)

export const SaleScreenQuery = graphql`
  query SaleAboveTheFoldQuery($saleID: String!, $saleSlug: ID!) {
    sale(id: $saleID) {
      ...Sale_sale
    }
    me @optionalField {
      ...Sale_me
    }
  }
`

export const SaleQueryRenderer: React.FC<{
  saleID: string
  environment?: RelayModernEnvironment
}> = ({ saleID, environment }) => {
  const { trackEvent } = useTracking()

  useEffect(() => {
    trackEvent(tracks.pageView(saleID))
  }, [])

  return (
    <RetryErrorBoundaryLegacy
      render={() => {
        return (
          <AboveTheFoldQueryRenderer<SaleAboveTheFoldQuery, SaleBelowTheFoldQuery>
            environment={environment || defaultEnvironment}
            above={{
              query: SaleScreenQuery,
              variables: { saleID, saleSlug: saleID },
            }}
            below={{
              query: graphql`
                # query SaleBelowTheFoldQuery($saleID: String!, $saleSlug: ID!) {
                query SaleBelowTheFoldQuery($saleID: ID) {
                  ...SaleLotsList_saleArtworksConnection @arguments(saleID: $saleID)
                  unfilteredSaleArtworksConnection: saleArtworksConnection(
                    saleID: $saleID
                    aggregations: [TOTAL]
                  ) {
                    ...SaleLotsList_unfilteredSaleArtworksConnection
                    counts {
                      total
                    }
                  }
                }
              `,
              variables: { saleID },
            }}
            render={({ props, error }) => {
              if (error) {
                if (__DEV__) {
                  console.error(error)
                } else {
                  captureMessage(error.stack!)
                }
                return <LoadFailureView />
              }
              if (!props?.above.me || !props.above.sale) {
                return <SalePlaceholder />
              }
              return (
                <SaleContainer sale={props.above.sale} me={props.above.me} below={props.below} />
              )
            }}
            cacheConfig={{
              force: true,
            }}
          />
        )
      }}
    />
  )
}
