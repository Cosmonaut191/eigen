import { Box } from "@artsy/palette"
import { CollectionHubsRails_collection } from "__generated__/CollectionHubsRails_collection.graphql"
import { CollectionHubsRails_linkedCollections } from "__generated__/CollectionHubsRails_linkedCollections.graphql"
import { CollectionArtistSeriesRailContainer as TrendingArtistSeriesRail } from "lib/Scenes/Collection/Components/CollectionHubsRails/ArtistSeries/CollectionArtistSeriesRail"
import React from "react"
import { createFragmentContainer, graphql } from "react-relay"
import { OtherCollectionsRailContainer as OtherCollectionsRail } from "./OtherCollections/OtherCollectionsRail"

interface CollectionsHubRailsProps {
  linkedCollections: CollectionHubsRails_linkedCollections
  collection: CollectionHubsRails_collection
}

export const CollectionsHubRails: React.SFC<CollectionsHubRailsProps> = props => {
  const { collection, linkedCollections } = props

  return (
    <>
      {linkedCollections.map(collectionGroup => (
        <Box key={collectionGroup.groupType}>
          {(() => {
            switch (collectionGroup.groupType) {
              case "ArtistSeries":
                return <TrendingArtistSeriesRail collectionGroup={collectionGroup} collection={collection} {...props} />
              case "OtherCollections":
                return <OtherCollectionsRail collectionGroup={collectionGroup} {...props} />
              default:
                return null
            }
          })()}
        </Box>
      ))}
    </>
  )
}

export const CollectionsHubRailsContainer = createFragmentContainer(CollectionsHubRails, {
  linkedCollections: graphql`
    fragment CollectionHubsRails_linkedCollections on MarketingCollectionGroup @relay(plural: true) {
      groupType
      ...CollectionArtistSeriesRail_collectionGroup
      ...OtherCollectionsRail_collectionGroup
    }
  `,

  collection: graphql`
    fragment CollectionHubsRails_collection on MarketingCollection {
      ...CollectionArtistSeriesRail_collection
    }
  `,
})
