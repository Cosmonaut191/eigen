import { SummarySection_section } from "__generated__/SummarySection_section.graphql"
import { extractNodes } from "app/utils/extractNodes"
import { Flex, Text } from "palette"
import React from "react"
import { createFragmentContainer, graphql } from "react-relay"

interface Props {
  section: SummarySection_section
}

export const SummarySection: React.FC<Props> = ({ section }) => {
  const { buyerTotal, taxTotal, shippingTotal, totalListPrice, lineItems, mode, lastOffer } =
    section
  const { selectedShippingQuote } = extractNodes(lineItems)?.[0] || {}
  const shippingName = selectedShippingQuote?.displayName
    ? `${selectedShippingQuote.displayName} delivery`
    : "Shipping"
  const isBuyOrder = mode === "BUY"
  const isBuyerOffer = !lastOffer || lastOffer.fromParticipant === "BUYER"

  return (
    <Flex flexDirection="row" justifyContent="space-between">
      <Flex>
        {isBuyOrder ? (
          <Text variant="sm" testID="totalListPriceLabel">
            Price
          </Text>
        ) : (
          <Text variant="sm" testID="offerLabel">
            {isBuyerOffer ? "Your offer" : "Seller's offer"}
          </Text>
        )}
        <Text variant="sm" mt={0.5} testID="shippingTotalLabel">
          {shippingName}
        </Text>
        <Text mt={0.5} variant="sm">
          Tax
        </Text>
        <Text variant="sm" mt={0.5}>
          Total
        </Text>
      </Flex>
      <Flex alignItems="flex-end">
        {isBuyOrder ? (
          <Text variant="sm" color="black60" testID="totalListPrice">
            {totalListPrice}
          </Text>
        ) : (
          <Text variant="sm" color="black60" testID="lastOffer">
            {(!!lastOffer && lastOffer.amount) || "—"}
          </Text>
        )}
        <Text variant="sm" color="black60" testID="shippingTotal" mt={0.5}>
          {shippingTotal}
        </Text>
        <Text variant="sm" color="black60" testID="taxTotal" mt={0.5}>
          {taxTotal}
        </Text>
        <Text variant="sm" mt={0.5} testID="buyerTotal">
          {buyerTotal}
        </Text>
      </Flex>
    </Flex>
  )
}

export const SummarySectionFragmentContainer = createFragmentContainer(SummarySection, {
  section: graphql`
    fragment SummarySection_section on CommerceOrder {
      mode
      buyerTotal(precision: 2)
      taxTotal(precision: 2)
      shippingTotal(precision: 2)
      totalListPrice(precision: 2)
      lineItems(first: 1) {
        edges {
          node {
            selectedShippingQuote {
              displayName
            }
          }
        }
      }
      ... on CommerceOfferOrder {
        lastOffer {
          amount(precision: 2)
          fromParticipant
        }
      }
    }
  `,
})
