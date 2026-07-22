import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthenticatedRouteGuard } from "@/components/AuthenticatedRouteGuard";

export const Route = createFileRoute("/payment old")({
  component: () => (
    <AuthenticatedRouteGuard>
      <PaymentPage />
    </AuthenticatedRouteGuard>
  ),
});

const PAYMENT_METHODS = [
  {
    id: "vodacom",
    name: "Vodacom M-Pesa",
    number: "0742 374 681",
    holder: "Emmanuel M. Alphonce",
  },
  {
    id: "airtel",
    name: "Airtel Money",
    number: "0693 413 655",
    holder: "Emmanuel M. Alphonce",
  },
  {
    id: "tigo",
    name: "Tigo Pesa",
    number: "0657 603 655",
    holder: "Emmanuel M. Alphonce",
  },
];
function PaymentPage() {
  const navigate = useNavigate();

  const [method, setMethod] = useState("vodacom");
  const [transactionId, setTransactionId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white flex justify-center py-10">
      <div className="w-full max-w-2xl rounded-xl border border-yellow-600 bg-[#111] p-8">
        <h1 className="text-3xl font-bold text-yellow-400">Complete Payment</h1>

        <p className="mt-2 text-gray-400">Finish your payment then upload your proof.</p>
        <div className="mt-8">
          <label className="block mb-3 text-sm font-semibold text-yellow-400">
            Choose Payment Method
          </label>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="vodacom"
                checked={method === "vodacom"}
                onChange={(e) => setMethod(e.target.value)}
              />
              Vodacom M-Pesa
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="airtel"
                checked={method === "airtel"}
                onChange={(e) => setMethod(e.target.value)}
              />
              Airtel Money
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="tigo"
                checked={method === "tigo"}
                onChange={(e) => setMethod(e.target.value)}
              />
              Tigo Pesa
            </label>
          </div>
        </div>
        <div className="mt-6 rounded-lg border border-yellow-600 p-4">
          {method === "vodacom" && (
            <>
              <h3 className="font-bold text-yellow-400">Vodacom M-Pesa</h3>
              <p className="mt-2">
                <strong>Name:</strong> Emmanuel M. Alphonce
              </p>
              <p>
                <strong>Number:</strong> 0744374681
              </p>
            </>
          )}
          {method === "airtel" && (
            <>
              <h3 className="font-bold text-yellow-400">Airtel Money</h3>
              <p className="mt-2">
                <strong>Name:</strong> Emmanuel M. Alphonce
              </p>
              <p>
                <strong>Number:</strong> 0693413655
              </p>
            </>
          )}
          {method === "tigo" && (
            <>
              <h3 className="font-bold text-yellow-400">Tigo Pesa</h3>
              <p className="mt-2">
                <strong>Name:</strong> Emmanuel M. Alphonce
              </p>
              <p>
                <strong>Number:</strong> 0657603655
              </p>
            </>
          )}
        </div>
        <div className="mt-6">
          <label className="block mb-2 text-sm font-semibold text-yellow-400">Transaction ID</label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Enter transaction ID"
            className="w-full rounded-lg border border-yellow-600 bg-black px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <div className="mt-6">
            <label className="block mb-2 text-sm font-semibold text-yellow-400">
              Upload Payment Screenshot
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-yellow-600 bg-black p-3 text-white"
            />
          </div>

          <div className="mt-8">
            <button className="w-full rounded-lg bg-yellow-500 py-3 text-black font-bold hover:bg-yellow-400 transition">
              Submit Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
