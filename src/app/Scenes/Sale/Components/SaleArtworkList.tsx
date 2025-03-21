import { ScreenOwnerType } from "@artsy/cohesion"
import { SaleArtworkList_connection } from "__generated__/SaleArtworkList_connection.graphql"
import { PAGE_SIZE } from "app/Components/constants"
import Spinner from "app/Components/Spinner"
import { ZeroState } from "app/Components/States/ZeroState"
import { Spacer } from "palette"
import React, { useState } from "react"
import { FlatList } from "react-native"
import { createFragmentContainer, graphql, RelayPaginationProp } from "react-relay"
import { extractNodes } from "../../../utils/extractNodes"
import { SaleArtworkListItemContainer as SaleArtworkListItem } from "./SaleArtworkListItem"

interface Props {
  connection: SaleArtworkList_connection
  loadMore: RelayPaginationProp["loadMore"]
  hasMore: RelayPaginationProp["hasMore"]
  isLoading: RelayPaginationProp["isLoading"]
  contextScreenOwnerType?: ScreenOwnerType
  contextScreenOwnerId?: string
  contextScreenOwnerSlug?: string
}

export const SaleArtworkList: React.FC<Props> = ({
  connection,
  loadMore,
  hasMore,
  isLoading,
  contextScreenOwnerType,
}) => {
  const [loadingMoreData, setLoadingMoreData] = useState(false)

  const loadMoreArtworks = () => {
    if (!hasMore() || isLoading()) {
      return
    }
    setLoadingMoreData(true)
    loadMore(PAGE_SIZE, (error) => {
      if (error) {
        console.log(error.message)
      }
      setLoadingMoreData(false)
    })
  }

  const artworks = extractNodes(connection)

  return (
    <FlatList
      data={artworks}
      onEndReached={loadMoreArtworks}
      ItemSeparatorComponent={() => <Spacer mb="20px" />}
      ListFooterComponent={
        loadingMoreData ? <Spinner style={{ marginTop: 20, marginBottom: 20 }} /> : null
      }
      renderItem={({ item }) => (
        <SaleArtworkListItem
          artwork={item}
          key={item.id}
          contextScreenOwnerType={contextScreenOwnerType}
        />
      )}
      keyExtractor={(item) => item.id!}
      style={{ paddingHorizontal: 20 }}
      ListEmptyComponent={() => (
        <ZeroState
          title="You haven’t followed any artists yet"
          subtitle="When you’ve found an artist you like, follow them to get updates on new works that become available."
        />
      )}
    />
  )
}

export const SaleArtworkListContainer = createFragmentContainer(SaleArtworkList, {
  connection: graphql`
    fragment SaleArtworkList_connection on ArtworkConnectionInterface {
      edges {
        node {
          id
          ...SaleArtworkListItem_artwork
        }
      }
    }
  `,
})
