import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/payment")({
  component: PaymentPage,
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

        <h1 className="text-3xl font-bold text-yellow-400">
          Complete Payment
        </h1>

        <p className="mt-2 text-gray-400">
          Finish your payment then upload your proof.
        </p>

      </div>
    </div>
  );
}