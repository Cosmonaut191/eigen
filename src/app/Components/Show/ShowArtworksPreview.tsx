import { ShowArtworksPreview_show } from "__generated__/ShowArtworksPreview_show.graphql"
import GenericGrid from "app/Components/ArtworkGrids/GenericGrid"
import { CaretButton } from "app/Components/Buttons/CaretButton"
import { extractNodes } from "app/utils/extractNodes"
import { Box, Sans } from "palette"
import React from "react"
import { injectIntl, IntlShape } from "react-intl"
import { createFragmentContainer, graphql, RelayProp } from "react-relay"

interface Props {
  onViewAllArtworksPressed: () => void
  show: ShowArtworksPreview_show
  title?: string
  relay: RelayProp
  intl: IntlShape
}

export class ShowArtworksPreview extends React.Component<Props> {
  render() {
    const { show, onViewAllArtworksPressed, title } = this.props
    if (!show) {
      return null
    }
    const { counts } = show
    const artworks = extractNodes(show.artworks)
    return (
      <>
        {!!title && (
          <Sans size="4t" mb={2}>
            {title}
          </Sans>
        )}
        <GenericGrid artworks={artworks} />
        {counts! /*STRICTNESS_MIGRATION*/.artworks! /*STRICTNESS_MIGRATION*/ > artworks.length && (
          <Box mt={1}>
            <CaretButton
              text={this.props.intl.formatMessage(
                {
                  id: "component.show.showArtworksPreview.caretButton",
                },
                { length: counts?.artworks ?? 0 }
              )}
              onPress={() => onViewAllArtworksPressed()}
            />
          </Box>
        )}
      </>
    )
  }
}

export const ShowArtworksPreviewContainer = createFragmentContainer(
  injectIntl(ShowArtworksPreview),
  {
    show: graphql`
      fragment ShowArtworksPreview_show on Show {
        id
        counts {
          artworks
        }
        artworks: artworksConnection(first: 6) {
          edges {
            node {
              ...GenericGrid_artworks
            }
          }
        }
      }
    `,
  }
)
