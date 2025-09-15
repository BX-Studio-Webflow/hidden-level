import https from "https";
import axios, { type AxiosError, type AxiosResponse } from "axios";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { Opening } from "../../../../../types/opening";
import { Requisition } from "../../../../../types/requisition";

export const dynamic = "force-static";
const revalidate = 10 * 60; // Fallback revalidation time

export async function GET(request: Request) {
  const fetchJobRequisitions = unstable_cache(
    async () => {
      const route = "/staffing/v1/job-requisitions";
      const endpoint = new URL(route, process.env.ADP_API_BASE_URL as string);
      endpoint.searchParams.set(
        "$filter",
        "requisitionStatusCode/codeValue eq ON"
      );
      endpoint.searchParams.set("$top", "20");

      const cert = process.env.CERT_PEM;
      const key = process.env.KEY_PEM;

      // Create HTTPS agent with mTLS
      const httpsAgent = new https.Agent({
        cert,
        key,
        rejectUnauthorized: true,
      });

      // Obtain OAuth2 token
      const token = await getAccessToken(httpsAgent);

      let allRequisitions: Requisition["jobRequisitions"] = [];
      let skip = 0;
      let totalNumber = 0;

      do {
        // Set skip parameter for current batch
        endpoint.searchParams.set("$skip", skip.toString());

        // Make request to ADP API
        const adpResponse: AxiosResponse = await axios.get(endpoint.href, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          httpsAgent,
        });

        const batchData = adpResponse.data as Requisition;

        // Add current batch to all requisitions
        allRequisitions = [...allRequisitions, ...batchData.jobRequisitions];

        // Update total number from meta (should be consistent across batches)
        totalNumber = batchData.meta.totalNumber;

        // Increment skip for next batch
        skip += 20;
      } while (skip < totalNumber);

      // Return consolidated data with all requisitions
      return {
        jobRequisitions: allRequisitions,
        meta: { totalNumber },
      } as Requisition;
    },
    ["job-requisitions"], // Cache tag
    {
      revalidate,
    }
  );

  try {
    const requisitions = await fetchJobRequisitions();
    const openings = restructureOpenings(requisitions);
    return NextResponse.json(openings, { status: 200 });
  } catch (error) {
    const axiosError = error as AxiosError;
    return NextResponse.json(
      { error: axiosError.message },
      { status: axiosError.response?.status || 500 }
    );
  }
}

async function getAccessToken(httpsAgent: https.Agent): Promise<string> {
  const auth = Buffer.from(
    `${process.env.ADP_CLIENT_ID}:${process.env.ADP_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const response: AxiosResponse<{ access_token: string }> = await axios.post(
      `${process.env.ADP_API_BASE_URL}/auth/oauth/v2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        httpsAgent,
      }
    );

    return response.data.access_token;
  } catch (error) {
    throw new Error("Failed to retrieve access token");
  }
}

function restructureOpenings(openings: Requisition) {
  const jobMap: Opening = {};
  const currentDate = new Date();

  openings.jobRequisitions.forEach((jobRequisition) => {
    const department =
      jobRequisition.organizationalUnits[0].nameCode.shortName ?? "Others";
    if (department === "All") return;
    const openingLink =
      jobRequisition.links.find(
        (link) => link.title === "HL External Career Center"
      )?.href ?? "";
    const jobTitle = jobRequisition.postingInstructions[0].nameCode.codeValue;
    const expireDate = jobRequisition.postingInstructions[0].expireDate;
    const cityName = jobRequisition.requisitionLocations[0].address.cityName;
    const codeValue =
      jobRequisition.requisitionLocations[0].address.countrySubdivisionLevel1
        ?.codeValue ?? "";
    const countryCode =
      jobRequisition.requisitionLocations[0].address.countryCode;
    const workerTypeCode = jobRequisition.workerTypeCode?.shortName ?? "";

    // Filter out expired openings
    if (expireDate && new Date(expireDate) < currentDate) {
      return; // Skip this opening as it has expired
    }

    if (!jobMap[department]) {
      jobMap[department] = [];
    }

    jobMap[department].push({
      jobTitle,
      openingLink,
      cityName,
      codeValue,
      countryCode,
      workerTypeCode,
      expireDate,
    });
  });
  return jobMap;
}
