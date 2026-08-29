import type * as React from "react";

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={512}
		height={512}
		viewBox="0 0 512 512"
		fill="none"
		aria-label="MyLegalXpert Logo"
		{...props}
	>
		<path
			d="M64 448V64h72l120 168L376 64h72v384h-64V180L256 360 128 180v268z"
			fill="currentColor"
		/>
	</svg>
);
export default Logo;
