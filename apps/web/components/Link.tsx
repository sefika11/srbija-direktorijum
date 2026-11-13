/** The site's link: next/link without viewport prefetch.
 *  A directory page carries hundreds of links, and next/link fetches every one that scrolls into view: the Belgrade page
 *  pulled 380 kB of other pages on a phone before the visitor touched anything, and each fetch is a request against the
 *  hosting plan. Pages are static and come from the CDN, so a click without a prefetch is still quick.
 *  Pass `prefetch` to turn it back on for one link. */
import NextLink from "next/link";
import type { ComponentProps } from "react";

export default function Link({ prefetch = false, ...rest }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...rest} />;
}
