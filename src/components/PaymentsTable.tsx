import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  ColumnDef,
  ColumnFiltersState,
  createSolidTable,
} from '@tanstack/solid-table'
import { debounce } from '@solid-primitives/scheduled'
import { createSignal, For } from 'solid-js'

declare module "solid-js" {
  namespace JSX {
    interface ExplicitProperties {
      indeterminate: boolean;
    }
  }
}

type Payment = {
  id: string
  date: string
  grossPay: string
  netPay: string
}

const columns: ColumnDef<Payment>[] = [
  {
    id: 'select-col',
    header: ({ table }) => (
      <input
        type="checkbox"
        prop:indeterminate={table.getIsSomeRowsSelected()}
        checked={table.getIsAllRowsSelected()}
        class="tw:checkbox tw:checkbox-xs tw:checkbox-primary tw:no-animation"
        onChange={table.getToggleAllRowsSelectedHandler()} //or getToggleAllPageRowsSelectedHandler
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        class="tw:checkbox tw:checkbox-xs tw:checkbox-primary tw:no-animation"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
  },
  {
    accessorKey: 'date',
    header: () => 'Date',
    footer: info => info.column.id,
  },
  {
    accessorKey: 'grossPay',
    header: () => 'Gross Pay',
    footer: info => info.column.id,
  },
  {
    accessorKey: 'netPay',
    header: () => 'Net Pay',
    footer: info => info.column.id,
  },
]

const Main = (props: {}) => {
  const [globalFilter, setGlobalFilter] = createSignal('');
  const [rowSelection, setRowSelection] = createSignal({});
  const debounceSetGlobalFilter = debounce(
    (value: string) => setGlobalFilter(value),
    500
  );

  const table = createSolidTable({
    get data() {
      return [
        {
          id: "2324345346",
          date: "2025-05-05",
          grossPay: "$15234.5",
          netPay: "$1000.2",
        },
        {
          id: "1324345346",
          date: "2025-05-06",
          grossPay: "$25234.5",
          netPay: "$2000.2",
        }
      ];
    },
    columns,
    state: {
      rowSelection: rowSelection(),
      get globalFilter() {
        return globalFilter()
      },
    },
    onRowSelectionChange: updateOrValue => {
      setRowSelection(
        typeof updateOrValue === 'function'
          ? updateOrValue(rowSelection())
          : updateOrValue)
    },
    getRowId: row => row.id,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableMultiRowSelection: true,
    debugTable: false,
    debugHeaders: false,
    debugColumns: false,
  });

  return <div>
    <input
      class="tw:input"
      value={globalFilter() ?? ''}
      onInput={e => debounceSetGlobalFilter(e.currentTarget.value)}
      placeholder="Search..."
    />

    <table class="tw:table">
      <thead>
        <For each={table.getHeaderGroups()}>
          {headerGroup => (
            <tr>
              <For each={headerGroup.headers}>
                {header => (
                  <th colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </>
                    )}
                  </th>
                )}
              </For>
            </tr>
          )}
        </For>
      </thead>
      <tbody>
        <For each={table.getRowModel().rows.slice(0, 10)}>
          {row => (
            <tr>
              <For each={row.getVisibleCells()}>
                {cell => (
                  <td>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </td>
                )}
              </For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  </div>;
};

export default Main;