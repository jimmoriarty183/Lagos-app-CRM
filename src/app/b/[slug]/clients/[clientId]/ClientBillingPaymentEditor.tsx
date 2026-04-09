"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { saveClientBillingProfile } from "@/app/b/[slug]/clients/actions";

type BillingPaymentEditorProps = {
  clientId: string;
  businessSlug: string;
  companyProfile: {
    companyName: string;
    registrationNumber: string;
    vatNumber: string;
    address: string;
    postcode: string;
  };
  billingProfile: {
    legalEntityName: string;
    registrationNumber: string;
    vatNumber: string;
    taxId: string;
    legalAddress: string;
    postcode: string;
    sameAsCompanyProfile: boolean;
    bankName: string;
    accountNumber: string;
    swiftBic: string;
    currencyCode: "GBP" | "UAH" | "EUR" | "USD";
    paymentMethod: "bank_transfer" | "cash" | "card";
    paymentTerms: "prepaid" | "net_7" | "net_14" | "net_30" | "custom";
    paymentTermsCustom: string;
    primaryEmailSource: "primary_contact" | "custom";
    primaryEmail: string;
    invoiceEmailSource: "primary_contact" | "custom";
    invoiceEmail: string;
  };
  primaryContactEmail: string;
};

export function ClientBillingPaymentEditor({
  clientId,
  businessSlug,
  companyProfile,
  billingProfile,
  primaryContactEmail,
}: BillingPaymentEditorProps) {
  const [sameAsCompanyProfile, setSameAsCompanyProfile] = React.useState(
    billingProfile.sameAsCompanyProfile,
  );
  const [legalEntityName, setLegalEntityName] = React.useState(
    billingProfile.legalEntityName,
  );
  const [registrationNumber, setRegistrationNumber] = React.useState(
    billingProfile.registrationNumber,
  );
  const [vatNumber, setVatNumber] = React.useState(billingProfile.vatNumber);
  const [taxId, setTaxId] = React.useState(billingProfile.taxId);
  const [legalAddress, setLegalAddress] = React.useState(
    billingProfile.legalAddress,
  );
  const [postcode, setPostcode] = React.useState(billingProfile.postcode);

  const [bankName, setBankName] = React.useState(billingProfile.bankName);
  const [accountNumber, setAccountNumber] = React.useState(
    billingProfile.accountNumber,
  );
  const [swiftBic, setSwiftBic] = React.useState(billingProfile.swiftBic);
  const [currencyCode, setCurrencyCode] = React.useState<"GBP" | "UAH" | "EUR" | "USD">(
    billingProfile.currencyCode,
  );
  const [paymentMethod, setPaymentMethod] = React.useState<
    "bank_transfer" | "cash" | "card"
  >(billingProfile.paymentMethod);
  const [paymentTerms, setPaymentTerms] = React.useState<
    "prepaid" | "net_7" | "net_14" | "net_30" | "custom"
  >(billingProfile.paymentTerms);
  const [paymentTermsCustom, setPaymentTermsCustom] = React.useState(
    billingProfile.paymentTermsCustom,
  );

  const [primaryEmailSource, setPrimaryEmailSource] = React.useState<
    "primary_contact" | "custom"
  >(billingProfile.primaryEmailSource);
  const [primaryEmail, setPrimaryEmail] = React.useState(
    billingProfile.primaryEmail,
  );
  const [invoiceEmailSource, setInvoiceEmailSource] = React.useState<
    "primary_contact" | "custom"
  >(billingProfile.invoiceEmailSource);
  const [invoiceEmail, setInvoiceEmail] = React.useState(
    billingProfile.invoiceEmail,
  );

  const [message, setMessage] = React.useState<string | null>(null);
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!sameAsCompanyProfile) return;
    setLegalEntityName(companyProfile.companyName);
    setRegistrationNumber(companyProfile.registrationNumber);
    setVatNumber(companyProfile.vatNumber);
    setLegalAddress(companyProfile.address);
    setPostcode(companyProfile.postcode);
  }, [sameAsCompanyProfile, companyProfile]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorText(null);

    startTransition(async () => {
      try {
        await saveClientBillingProfile({
          clientId,
          businessSlug,
          legalEntityName,
          registrationNumber,
          vatNumber,
          taxId,
          legalAddress,
          postcode,
          sameAsCompanyProfile,
          bankName,
          accountNumber,
          swiftBic,
          currencyCode,
          paymentMethod,
          paymentTerms,
          paymentTermsCustom,
          primaryEmailSource,
          primaryEmail,
          invoiceEmailSource,
          invoiceEmail,
        });
        setMessage("Billing and payment details saved.");
      } catch (error) {
        setErrorText(
          error instanceof Error
            ? error.message
            : "Failed to save billing settings",
        );
      }
    });
  }

  return (
    <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Billing &amp; Payment details
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Legal entity data, payment setup, and dedicated communication
            emails.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={sameAsCompanyProfile}
            onChange={(event) =>
              setSameAsCompanyProfile(event.currentTarget.checked)
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          Same as company profile
        </label>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
            Billing (legal) information
          </h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              value={legalEntityName}
              onChange={(event) =>
                setLegalEntityName(event.currentTarget.value)
              }
              placeholder="Legal entity name"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            />
            <input
              value={registrationNumber}
              onChange={(event) =>
                setRegistrationNumber(event.currentTarget.value)
              }
              placeholder="Registration number"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            />
            <input
              value={vatNumber}
              onChange={(event) => setVatNumber(event.currentTarget.value)}
              placeholder="VAT number"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            />
            <input
              value={taxId}
              onChange={(event) => setTaxId(event.currentTarget.value)}
              placeholder="Tax ID"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            />
            <input
              value={legalAddress}
              onChange={(event) => setLegalAddress(event.currentTarget.value)}
              placeholder="Legal address"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none md:col-span-2"
            />
            <input
              value={postcode}
              onChange={(event) => setPostcode(event.currentTarget.value)}
              placeholder="Postcode"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
            Payment details
          </h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              value={bankName}
              onChange={(event) => setBankName(event.currentTarget.value)}
              placeholder="Bank name"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            />
            <input
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.currentTarget.value)}
              placeholder="IBAN / Account number"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            />
            <input
              value={swiftBic}
              onChange={(event) => setSwiftBic(event.currentTarget.value)}
              placeholder="SWIFT / BIC"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            />
            <select
              value={currencyCode}
              onChange={(event) =>
                setCurrencyCode(
                  event.currentTarget.value as "GBP" | "UAH" | "EUR" | "USD",
                )
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="GBP">GBP</option>
              <option value="UAH">UAH</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(
                  event.currentTarget.value as
                    | "bank_transfer"
                    | "cash"
                    | "card",
                )
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
            </select>
            <select
              value={paymentTerms}
              onChange={(event) =>
                setPaymentTerms(
                  event.currentTarget.value as
                    | "prepaid"
                    | "net_7"
                    | "net_14"
                    | "net_30"
                    | "custom",
                )
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="prepaid">Prepaid</option>
              <option value="net_7">Net 7</option>
              <option value="net_14">Net 14</option>
              <option value="net_30">Net 30</option>
              <option value="custom">Custom</option>
            </select>
            {paymentTerms === "custom" ? (
              <input
                value={paymentTermsCustom}
                onChange={(event) =>
                  setPaymentTermsCustom(event.currentTarget.value)
                }
                placeholder="Custom payment terms"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none md:col-span-2"
              />
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
            Communication emails
          </h3>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate-600">
                Primary email source
              </span>
              <select
                value={primaryEmailSource}
                onChange={(event) =>
                  setPrimaryEmailSource(
                    event.currentTarget.value as "primary_contact" | "custom",
                  )
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
              >
                <option value="primary_contact">From primary contact</option>
                <option value="custom">Custom email</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate-600">
                Primary email
              </span>
              <input
                value={
                  primaryEmailSource === "primary_contact"
                    ? primaryContactEmail
                    : primaryEmail
                }
                onChange={(event) => setPrimaryEmail(event.currentTarget.value)}
                disabled={primaryEmailSource === "primary_contact"}
                placeholder="Primary communication email"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none disabled:bg-slate-100"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate-600">
                Invoice email source
              </span>
              <select
                value={invoiceEmailSource}
                onChange={(event) =>
                  setInvoiceEmailSource(
                    event.currentTarget.value as "primary_contact" | "custom",
                  )
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
              >
                <option value="primary_contact">From primary contact</option>
                <option value="custom">Custom email</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate-600">
                Invoice email
              </span>
              <input
                value={
                  invoiceEmailSource === "primary_contact"
                    ? primaryContactEmail
                    : invoiceEmail
                }
                onChange={(event) => setInvoiceEmail(event.currentTarget.value)}
                disabled={invoiceEmailSource === "primary_contact"}
                placeholder="Invoices and billing email"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none disabled:bg-slate-100"
              />
            </label>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Primary contact email: {primaryContactEmail || "not available"}
          </p>
        </div>

        {errorText ? (
          <div className="text-sm font-medium text-rose-700">{errorText}</div>
        ) : null}
        {message ? (
          <div className="text-sm font-medium text-emerald-700">{message}</div>
        ) : null}

        <Button
          type="submit"
          className="h-10 rounded-lg px-4 text-sm font-semibold"
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save billing & payment"}
        </Button>
      </form>
    </section>
  );
}
