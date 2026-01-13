import { NextResponse } from "next/server";
import { getFireFly, getMspIdentity } from "../packages/service";

export async function GET() {
  try {
    const ff = await getFireFly();

    // Get only org identities
    const identities = await ff.getIdentities({
      fetchverifiers: "true",
      type: "org",
    });

    console.log(
      "Raw identities from Firefly:",
      JSON.stringify(identities, null, 2),
    );
    console.log("Number of identities:", identities.length);

    const mappedIdentities = identities
      .map((identity) => {
        console.log("Processing identity:", identity.name);
        console.log("Verifiers:", identity.verifiers);

        const verifiers = identity.verifiers;
        if (!verifiers || verifiers.length === 0) {
          console.log("No verifiers found for:", identity.name);
          return undefined;
        }

        const verifierValue = verifiers[0].value;
        console.log("Verifier value:", verifierValue);

        const mspID = verifierValue?.split(":")[0];
        if (!mspID) {
          console.log("No MSP ID found for:", identity.name);
          return undefined;
        }

        console.log("Successfully mapped:", { name: identity.name, mspID });
        return {
          name: identity.name,
          mspID,
        };
      })
      .filter((identity) => identity !== undefined);

    console.log("Final mapped identities:", mappedIdentities);
    console.log("Number of mapped identities:", mappedIdentities.length);

    return NextResponse.json(mappedIdentities);
  } catch (error) {
    console.error("Error fetching identities:", error);
    return NextResponse.json(
      { error: "Failed to fetch identities", details: error },
      { status: 500 },
    );
  }
}
