import { themeGet } from "@styled-system/theme-get"
import { FeaturedCollectionsRail_collection } from "__generated__/FeaturedCollectionsRail_collection.graphql"
import { FeaturedCollectionsRail_collectionGroup } from "__generated__/FeaturedCollectionsRail_collectionGroup.graphql"
import { AboveTheFoldFlatList } from "app/Components/AboveTheFoldFlatList"
import ImageView from "app/Components/OpaqueImageView/OpaqueImageView"
import { navigate } from "app/navigation/navigate"
import { defaultRules } from "app/utils/renderMarkdown"
import { renderMarkdown } from "app/utils/renderMarkdown"
import { Schema } from "app/utils/track"
import { Flex, Sans, Spacer, Touchable, useColor } from "palette"
import React from "react"
import { createFragmentContainer, graphql } from "react-relay"
import { useTracking } from "react-tracking"
import styled from "styled-components/native"

interface FeaturedCollectionsRailProps {
  collectionGroup: FeaturedCollectionsRail_collectionGroup
  collection: FeaturedCollectionsRail_collection
}

type FeaturedCollection = FeaturedCollectionsRail_collectionGroup["members"][0]

export const FeaturedCollectionsRail: React.FC<FeaturedCollectionsRailProps> = (props) => {
  const color = useColor()
  const tracking = useTracking()
  const { collection, collectionGroup } = props
  const collections = collectionGroup?.members ?? []

  const handleMarkdown = (markdown: string, titleLength: number) => {
    const markdownRules = defaultRules({
      modal: true,
      ruleOverrides: {
        paragraph: {
          react: (node, output, state) => (
            <Sans
              size="3t"
              color="black100"
              key={state.key}
              numberOfLines={titleLength > 32 ? 3 : 4}
            >
              {output(node.content, state)}
            </Sans>
          ),
        },
      },
    })

    return renderMarkdown(markdown, markdownRules)
  }

  const handleNavigation = (slug: string) => {
    return navigate(`/collection/${slug}`)
  }

  return collections.length > 0 ? (
    <>
      <Flex ml="-20px">
        <Sans size="4" my={2} ml={4} testID="group">
          {collectionGroup.name}
        </Sans>
      </Flex>
      <AboveTheFoldFlatList<FeaturedCollection>
        horizontal
        showsHorizontalScrollIndicator={false}
        data={collections as FeaturedCollection[]}
        keyExtractor={(_item, index) => String(index)}
        initialNumToRender={3}
        ListHeaderComponent={() => <Spacer mx={1} />}
        ListFooterComponent={() => <Spacer mx={1} />}
        ItemSeparatorComponent={() => <Spacer mx={0.5} />}
        renderItem={({ item: result, index }) => {
          return (
            <Touchable
              underlayColor="transparent"
              onPress={() => {
                tracking.trackEvent({
                  action_type: Schema.ActionTypes.TappedCollectionGroup,
                  context_module: Schema.ContextModules.FeaturedCollectionsRail,
                  context_screen_owner_type: Schema.OwnerEntityTypes.Collection,
                  context_screen_owner_id: collection.id,
                  context_screen_owner_slug: collection.slug,
                  destination_screen_owner_type: Schema.OwnerEntityTypes.Collection,
                  destination_screen_owner_id: result.id,
                  destination_screen_owner_slug: result.slug,
                  horizontal_slide_position: index + 1,
                  type: "thumbnail",
                })

                handleNavigation(result.slug)
              }}
            >
              <ImageWrapper key={index} p={2}>
                <ImageView
                  width={220}
                  height={190}
                  imageURL={result?.featuredCollectionArtworks?.edges?.[0]?.node?.image?.url ?? ""}
                />
                <Sans size="3t" weight="medium" mt="15px" testID={"title-" + index}>
                  {result.title}
                </Sans>
                {!!result.priceGuidance && (
                  <Sans color={color("black60")} size="3t" mb={1} testID={"price-" + index}>
                    {"From $" + `${result.priceGuidance!.toLocaleString()}`}
                  </Sans>
                )}
                {handleMarkdown(result.descriptionMarkdown || "", result.title.length)}
              </ImageWrapper>
            </Touchable>
          )
        }}
      />
    </>
  ) : null
}

export const ImageWrapper = styled(Flex)`
  border: solid 1px ${themeGet("colors.black10")};
  height: 385px;
  width: 260px;
  border-radius: 5px;
`
export const FeaturedCollectionsRailContainer = createFragmentContainer(FeaturedCollectionsRail, {
  collection: graphql`
    fragment FeaturedCollectionsRail_collection on MarketingCollection {
      slug
      id
    }
  `,

  collectionGroup: graphql`
    fragment FeaturedCollectionsRail_collectionGroup on MarketingCollectionGroup {
      name
      members {
        slug
        id
        title
        priceGuidance
        descriptionMarkdown
        featuredCollectionArtworks: artworksConnection(
          first: 1
          aggregations: [TOTAL]
          sort: "-decayed_merch"
        ) {
          edges {
            node {
              image {
                url
              }
            }
          }
        }
      }
    }
  `,
})
