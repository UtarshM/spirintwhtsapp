import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSameOrigin, apiError, ApiError } from "@/lib/auth";

const orderSchema = z.object({
  amountRupees: z.number().positive().max(1000000),
  packLabel: z.string().max(50),
  gstin: z.string().max(20).optional(),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await request.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(422, "Invalid order parameters");
    }

    const { amountRupees, packLabel, gstin } = parsed.data;
    const basePaise = Math.round(amountRupees * 100);
    const gstPaise = Math.round(basePaise * 0.18);
    const totalPaise = basePaise + gstPaise;
    const invoiceNumber = `INV-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (razorpayKeyId && razorpayKeySecret) {
      try {
        const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
        const res = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: totalPaise,
            currency: "INR",
            receipt: invoiceNumber,
            notes: {
              pack: packLabel,
              gstin: gstin || "Unregistered",
            },
          }),
        });

        if (res.ok) {
          const razorpayOrder = await res.json();
          return NextResponse.json({
            success: true,
            orderId: razorpayOrder.id,
            keyId: razorpayKeyId,
            basePaise,
            gstPaise,
            totalPaise,
            invoiceNumber,
            currency: "INR",
            isLive: true,
          });
        }
      } catch {
        // Fall back to sandbox response
      }
    }

    // Sandbox order creation
    const mockOrderId = `order_sim_${Date.now()}`;
    return NextResponse.json({
      success: true,
      orderId: mockOrderId,
      keyId: razorpayKeyId || "rzp_test_sandbox",
      basePaise,
      gstPaise,
      totalPaise,
      invoiceNumber,
      currency: "INR",
      isLive: false,
    });
  } catch (err: unknown) {
    return apiError(err);
  }
}

