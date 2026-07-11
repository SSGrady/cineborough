import type { ComparableSale } from "@cineborough/data";
import { formatCurrency } from "@/lib/format";

interface ComparableSalesTableProps {
  comparables: ComparableSale[];
}

export function ComparableSalesTable({ comparables }: ComparableSalesTableProps) {
  return (
    <section className="comps-table" aria-label="Comparable sales">
      <h3>Comparable Sales</h3>
      <div className="comps-table__scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Address</th>
              <th scope="col">Price</th>
              <th scope="col">Bd/Ba</th>
              <th scope="col">Sqft</th>
              <th scope="col">Lot</th>
              <th scope="col">$/sf</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {comparables.map((comp) => (
              <tr key={comp.address}>
                <td>{comp.address}</td>
                <td>{formatCurrency(comp.price)}</td>
                <td>
                  {comp.bedrooms}/{comp.bathrooms}
                </td>
                <td>{comp.sqft.toLocaleString()}</td>
                <td>{comp.lotSqft > 0 ? comp.lotSqft.toLocaleString() : "—"}</td>
                <td>${comp.pricePerSqft}</td>
                <td>
                  <span className={`comps-table__status comps-table__status--${comp.status.toLowerCase()}`}>
                    {comp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
