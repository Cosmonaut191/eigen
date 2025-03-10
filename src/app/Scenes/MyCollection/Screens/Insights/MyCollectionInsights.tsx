import { MyCollectionInsightsQuery } from "__generated__/MyCollectionInsightsQuery.graphql"
import { StickyTabPageScrollView } from "app/Components/StickyTabPage/StickyTabPageScrollView"
import { Flex, Text, useSpace } from "palette"
import React, { Suspense } from "react"
import { useLazyLoadQuery } from "react-relay"
import { graphql } from "relay-runtime"
import { AuctionResultsBasedOnArtistsYouCollect } from "./AuctionResultsBasedOnArtistsYouCollect"
import { MyCollectionInsightsOverview } from "./MyCollectionInsightsOverview"

export const MyCollectionInsights: React.FC<{}> = ({}) => {
  const space = useSpace()
  const data = useLazyLoadQuery<MyCollectionInsightsQuery>(MyCollectionInsightsScreenQuery, {})

  return (
    <StickyTabPageScrollView contentContainerStyle={{ paddingTop: space("2") }}>
      <MyCollectionInsightsOverview />
      <AuctionResultsBasedOnArtistsYouCollect auctionResults={data.me!} />
    </StickyTabPageScrollView>
  )
}

export const MyCollectionInsightsQR: React.FC<{}> = () => (
  <Suspense fallback={<MyCollectionInsightsPlaceHolder />}>
    <MyCollectionInsights />
  </Suspense>
)

// TODO: fix, placeHolder is hidden behind the header
export const MyCollectionInsightsPlaceHolder = () => (
  <Flex>
    <Text>A Placeholder</Text>
  </Flex>
)

export const MyCollectionInsightsScreenQuery = graphql`
  query MyCollectionInsightsQuery {
    me {
      ...AuctionResultsBasedOnArtistsYouCollect_me
    }
  }
`
