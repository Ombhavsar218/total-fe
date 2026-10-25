import type { Bill, BusinessProfile, Shop, ShopBillsResponse } from "@/types";
import { amountInWords, splitGst } from "@/lib/invoice";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

function BusinessDetails({
  business,
  align = "left",
}: {
  business: BusinessProfile | null;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <h1 className="text-[19px] font-bold leading-tight tracking-tight text-slate-900">
        {business?.name || "TotalStock Distributors"}
      </h1>
      <p className="mt-1 max-w-[95mm] whitespace-pre-line text-[10px] leading-4 text-slate-600">
        {business?.address || "Business address not configured"}
      </p>
      <p className="mt-1 text-[10px] text-slate-600">
        {business?.phone && <>Phone: {business.phone}</>}
        {business?.phone && business?.email && <span className="mx-1.5 text-slate-300">|</span>}
        {business?.email && <>{business.email}</>}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] font-semibold text-slate-700">
        {business?.gst_no && <span>GSTIN: {business.gst_no}</span>}
        {business?.fssai_no && <span>FSSAI: {business.fssai_no}</span>}
        {business?.state_code && <span>State code: {business.state_code}</span>}
      </div>
    </div>
  );
}

function SignatureBlock({ business }: { business: BusinessProfile | null }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-6 text-[9.5px] text-slate-600">
      <div>
        <p className="font-semibold uppercase tracking-wide text-slate-400">Bank details</p>
        <p className="mt-1 leading-4">
          {business?.bank_name || "—"}
          {business?.bank_account_no && (
            <>
              <br />
              A/c: {business.bank_account_no}
            </>
          )}
          {business?.bank_branch && (
            <>
              {" "}
              · {business.bank_branch}
            </>
          )}
          {business?.bank_ifsc && (
            <>
              <br />
              IFSC: {business.bank_ifsc}
            </>
          )}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold uppercase tracking-wide text-slate-400">
          For {business?.name || "TotalStock"}
        </p>
        <div className="mt-10 border-t border-slate-300 pt-1.5 text-[9px]">Authorised signatory</div>
      </div>
    </div>
  );
}

const SHEET =
  "invoice-sheet mx-auto w-full max-w-[210mm] bg-white text-slate-900";

function TotalsBlock({
  subtotal,
  taxAmount,
  roundOff,
  totalAmount,
  compact = false,
}: {
  subtotal: string | number;
  taxAmount: string | number;
  roundOff?: string | number;
  totalAmount: string | number;
  compact?: boolean;
}) {
  const { sgst, cgst } = splitGst(taxAmount);
  return (
    <div className={compact ? "w-full max-w-[70mm] space-y-1 text-[10px]" : "w-full max-w-[78mm] space-y-1.5 text-[10.5px]"}>
      <div className="flex justify-between text-slate-600">
        <span>Taxable value</span>
        <span className="font-semibold text-slate-800">{formatCurrency(subtotal, true)}</span>
      </div>
      <div className="flex justify-between text-slate-600">
        <span>SGST</span>
        <span className="font-semibold text-slate-800">{formatCurrency(sgst, true)}</span>
      </div>
      <div className="flex justify-between text-slate-600">
        <span>CGST</span>
        <span className="font-semibold text-slate-800">{formatCurrency(cgst, true)}</span>
      </div>
      {roundOff !== undefined && Math.abs(toNumber(roundOff)) > 0.001 && (
        <div className="flex justify-between text-slate-600">
          <span>Round off</span>
          <span className="font-semibold text-slate-800">{formatCurrency(roundOff, true)}</span>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-700">
          Grand total
        </span>
        <span className="text-[15px] font-bold text-slate-900">
          {formatCurrency(totalAmount, true)}
        </span>
      </div>
    </div>
  );
}

function AmountWords({ total }: { total: string | number }) {
  return (
    <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Amount in words
      </p>
      <p className="mt-0.5 text-[10.5px] font-semibold text-slate-800">{amountInWords(total)}</p>
    </div>
  );
}

export function InvoiceDocument({ bill, business }: { bill: Bill; business: BusinessProfile | null }) {
  const totalQuantity = bill.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <article className={SHEET}>
      <header className="flex items-start justify-between gap-6 border-b-2 border-slate-800 pb-4">
        <BusinessDetails business={business} />
        <div className="shrink-0 text-right">
          <div className="inline-block rounded border border-slate-800 px-4 py-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-800">
              Tax Invoice
            </p>
          </div>
          <table className="mt-3 ml-auto text-[10px]">
            <tbody>
              <tr>
                <td className="pr-3 text-right font-semibold text-slate-500">Invoice No.</td>
                <td className="text-right font-bold text-slate-900">{bill.invoice_number}</td>
              </tr>
              <tr>
                <td className="pr-3 text-right font-semibold text-slate-500">Invoice Date</td>
                <td className="text-right font-semibold text-slate-800">{formatDate(bill.date)}</td>
              </tr>
              <tr>
                <td className="pr-3 text-right font-semibold text-slate-500">Items</td>
                <td className="text-right text-slate-700">
                  {bill.items.length} lines · {totalQuantity} qty
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-0 border-b border-slate-300">
        <div className="border-r border-slate-300 py-3 pr-4">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Billed to
          </p>
          <p className="mt-1 text-[12px] font-bold text-slate-900">{bill.customer_name}</p>
          <p className="mt-0.5 whitespace-pre-line text-[10px] leading-4 text-slate-600">
            {bill.customer_address}
          </p>
          <div className="mt-1.5 space-y-0.5 text-[9.5px] text-slate-600">
            {bill.customer_gst && <p>GSTIN: {bill.customer_gst}</p>}
            {bill.customer_fssai && <p>FSSAI: {bill.customer_fssai}</p>}
            {bill.customer_state_code && <p>State code: {bill.customer_state_code}</p>}
          </div>
        </div>
        <div className="py-3 pl-4">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Invoice summary
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-600">
            Place of supply: <span className="font-semibold text-slate-800">{bill.customer_state_code || "—"}</span>
          </p>
          <p className="text-[10px] leading-4 text-slate-600">
            Invoice date: <span className="font-semibold text-slate-800">{formatDate(bill.date, "long")}</span>
          </p>
          <p className="text-[10px] leading-4 text-slate-600">
            Billed by: <span className="font-semibold text-slate-800">{bill.created_by_name}</span>
          </p>
          <p className="mt-1.5 text-[9px] text-slate-500">
            Tax is charged at the rates shown against each line. All amounts are in INR.
          </p>
        </div>
      </section>

      <table className="mt-4 w-full table-fixed border-collapse text-[9.5px]">
        <thead>
          <tr className="bg-slate-100 text-[8px] font-bold uppercase tracking-wide text-slate-500">
            <th className="w-[5%] border border-slate-300 px-1.5 py-1.5 text-left">#</th>
            <th className="w-[27%] border border-slate-300 px-1.5 py-1.5 text-left">Description</th>
            <th className="w-[9%] border border-slate-300 px-1 py-1.5 text-center">HSN</th>
            <th className="w-[8%] border border-slate-300 px-1 py-1.5 text-center">Qty</th>
            <th className="w-[10%] border border-slate-300 px-1 py-1.5 text-right">Rate</th>
            <th className="w-[11%] border border-slate-300 px-1 py-1.5 text-right">Taxable</th>
            <th className="w-[10%] border border-slate-300 px-1 py-1.5 text-right">SGST</th>
            <th className="w-[10%] border border-slate-300 px-1 py-1.5 text-right">CGST</th>
            <th className="w-[11%] border border-slate-300 px-1 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, index) => {
            const sgst = toNumber(item.sgst);
            const cgst = toNumber(item.cgst);
            const lineTotal = toNumber(item.taxable_amount) + sgst + cgst;
            return (
              <tr key={item.id} className="align-top">
                <td className="border border-slate-300 px-1.5 py-1.5 text-slate-400">{index + 1}</td>
                <td className="border border-slate-300 px-1.5 py-1.5">
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-[8px] text-slate-400">
                    MRP {item.mrp ? formatCurrency(item.mrp, true) : "—"} · per {item.unit}
                  </p>
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-center text-slate-600">
                  {item.hsn_code || "—"}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-center text-slate-700">
                  {item.quantity} {item.unit}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-right text-slate-700">
                  {formatCurrency(item.price, true)}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-right text-slate-700">
                  {formatCurrency(item.taxable_amount, true)}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-right text-slate-700">
                  <span className="block text-[8px] text-slate-400">{toNumber(item.gst_rate) / 2}%</span>
                  {formatCurrency(sgst, true)}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-right text-slate-700">
                  <span className="block text-[8px] text-slate-400">{toNumber(item.gst_rate) / 2}%</span>
                  {formatCurrency(cgst, true)}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-right font-semibold text-slate-900">
                  {formatCurrency(lineTotal, true)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex items-start justify-between gap-6">
        <div className="max-w-[95mm] text-[9px] leading-4 text-slate-500">
          <p className="font-bold uppercase tracking-wide text-slate-400">Terms &amp; conditions</p>
          <p className="mt-1">
            Goods once sold will not be taken back. Payment as per agreed terms. Interest at 18% p.a.
            is applicable on overdue amounts. Subject to local jurisdiction.
          </p>
          <p className="mt-1.5">
            Declaration: We declare that this invoice shows the actual price of the goods described
            and that all particulars are true and correct.
          </p>
        </div>
        <TotalsBlock
          subtotal={bill.subtotal}
          taxAmount={bill.tax_amount}
          roundOff={bill.round_off}
          totalAmount={bill.total_amount}
        />
      </div>

      <AmountWords total={bill.total_amount} />
      <SignatureBlock business={business} />

      <footer className="mt-4 flex items-center justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
        <span>Computer generated tax invoice · {bill.invoice_number}</span>
        <span>TotalStock · Inventory &amp; Distributor Management</span>
      </footer>
    </article>
  );
}

export function ConsolidatedInvoiceDocument({
  shop,
  data,
  business,
  pageBreak = false,
}: {
  shop: Shop;
  data: ShopBillsResponse;
  business: BusinessProfile | null;
  pageBreak?: boolean;
}) {
  const invoiceNumbers = Array.from(new Set(data.items.map((item) => item.invoice_number)));
  return (
    <article className={`${SHEET} ${pageBreak ? "invoice-page-break" : ""}`}>
      <header className="flex items-start justify-between gap-6 border-b-2 border-slate-800 pb-4">
        <BusinessDetails business={business} />
        <div className="shrink-0 text-right">
          <div className="inline-block rounded border border-slate-800 px-4 py-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">
              Consolidated Invoice
            </p>
          </div>
          <table className="mt-3 ml-auto text-[10px]">
            <tbody>
              <tr>
                <td className="pr-3 text-right font-semibold text-slate-500">Date</td>
                <td className="text-right font-semibold text-slate-800">{formatDate(data.date)}</td>
              </tr>
              <tr>
                <td className="pr-3 text-right font-semibold text-slate-500">Bills</td>
                <td className="text-right text-slate-700">{data.bills_count}</td>
              </tr>
              <tr>
                <td className="pr-3 text-right font-semibold text-slate-500">Invoice nos.</td>
                <td className="max-w-[52mm] text-right text-[8.5px] text-slate-600">
                  {invoiceNumbers.join(", ") || "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-0 border-b border-slate-300">
        <div className="border-r border-slate-300 py-3 pr-4">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">Billed to</p>
          <p className="mt-1 text-[12px] font-bold text-slate-900">{shop.name}</p>
          <p className="mt-0.5 whitespace-pre-line text-[10px] leading-4 text-slate-600">
            {shop.address}
          </p>
          <div className="mt-1.5 space-y-0.5 text-[9.5px] text-slate-600">
            {shop.gst_no && <p>GSTIN: {shop.gst_no}</p>}
            {shop.fssai_no && <p>FSSAI: {shop.fssai_no}</p>}
            {shop.phone && <p>Phone: {shop.phone}</p>}
          </div>
        </div>
        <div className="py-3 pl-4">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">Summary</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-600">
            Line items: <span className="font-semibold text-slate-800">{data.items_count}</span>
          </p>
          <p className="text-[10px] leading-4 text-slate-600">
            Total quantity:{" "}
            <span className="font-semibold text-slate-800">
              {data.total_quantity} units
            </span>
          </p>
          <p className="text-[10px] leading-4 text-slate-600">
            Invoices consolidated:{" "}
            <span className="font-semibold text-slate-800">{data.bills_count}</span>
          </p>
          <p className="mt-1.5 text-[9px] text-slate-500">
            This statement consolidates every invoice raised for this shop on{" "}
            {formatDate(data.date, "long")}.
          </p>
        </div>
      </section>

      <table className="mt-4 w-full table-fixed border-collapse text-[9.5px]">
        <thead>
          <tr className="bg-slate-100 text-[8px] font-bold uppercase tracking-wide text-slate-500">
            <th className="w-[5%] border border-slate-300 px-1.5 py-1.5 text-left">#</th>
            <th className="w-[26%] border border-slate-300 px-1.5 py-1.5 text-left">Item</th>
            <th className="w-[9%] border border-slate-300 px-1 py-1.5 text-center">HSN</th>
            <th className="w-[8%] border border-slate-300 px-1 py-1.5 text-center">Qty</th>
            <th className="w-[10%] border border-slate-300 px-1 py-1.5 text-right">Rate</th>
            <th className="w-[11%] border border-slate-300 px-1 py-1.5 text-right">Taxable</th>
            <th className="w-[10%] border border-slate-300 px-1 py-1.5 text-right">SGST</th>
            <th className="w-[10%] border border-slate-300 px-1 py-1.5 text-right">CGST</th>
            <th className="w-[11%] border border-slate-300 px-1 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => {
            const lineTotal =
              toNumber(item.taxable_amount) + toNumber(item.sgst) + toNumber(item.cgst);
            return (
              <tr key={item.id} className="align-top">
                <td className="border border-slate-300 px-1.5 py-1.5 text-slate-400">{index + 1}</td>
                <td className="border border-slate-300 px-1.5 py-1.5">
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-[8px] text-slate-400">
                    {item.invoice_number} · per {item.unit}
                  </p>
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-center text-slate-600">
                  {item.hsn_code || "—"}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-center text-slate-700">
                  {item.quantity} {item.unit}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-right text-slate-700">
                  {formatCurrency(item.price, true)}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-right text-slate-700">
                  {formatCurrency(item.taxable_amount, true)}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-right text-slate-700">
                  {formatCurrency(item.sgst, true)}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-right text-slate-700">
                  {formatCurrency(item.cgst, true)}
                </td>
                <td className="border border-slate-300 px-1 py-1.5 text-right font-semibold text-slate-900">
                  {formatCurrency(lineTotal, true)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex items-start justify-between gap-6">
        <div className="max-w-[95mm] text-[9px] leading-4 text-slate-500">
          <p className="font-bold uppercase tracking-wide text-slate-400">Note</p>
          <p className="mt-1">
            Consolidated statement of sales for {shop.name}. Individual tax invoices listed above
            remain the statutory documents. Stock was deducted against each bill at the time of
            sale.
          </p>
        </div>
        <TotalsBlock
          subtotal={data.subtotal}
          taxAmount={data.tax_amount}
          roundOff={
            toNumber(data.total_amount) - toNumber(data.subtotal) - toNumber(data.tax_amount)
          }
          totalAmount={data.total_amount}
        />
      </div>

      <AmountWords total={data.total_amount} />
      <SignatureBlock business={business} />

      <footer className="mt-4 flex items-center justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
        <span>Consolidated invoice · {formatDate(data.date)}</span>
        <span>TotalStock · Inventory &amp; Distributor Management</span>
      </footer>
    </article>
  );
}
