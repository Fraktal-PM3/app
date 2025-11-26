import { NextResponse } from "next/server";
import { getFireFly } from "../packages/service";
import { FireFlyDataResponse } from "@hyperledger/firefly-sdk";

export async function GET() {
  try {
    const firefly = await getFireFly();
    
    // Fetch all private messages using FireFly API
    // The getMessages() method retrieves messages from the FireFly node
    const messages = await firefly.getMessages();
    
    // Filter for private messages only
    const privateMessages = messages.filter(
      (msg) => msg.header?.type === "private" || !msg.header?.type
    );

    const fetches: { promise: Promise<FireFlyDataResponse | undefined>; author?: string }[] = []

    privateMessages.forEach((msg) => {
        msg.data.forEach((obj) => {
            if (!obj.id) return
            fetches.push({ promise: firefly.getData(obj.id), author: msg.header?.author })
        })
    });

    const results = await Promise.all(fetches.map((f) => f.promise))
    const combined = results
      .map((res, i) => {
        if (!res) return undefined
        return { ...res, author: fetches[i].author }
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      messages: combined,
      count: privateMessages.length,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch messages",
      },
      { status: 500 }
    );
  }
}