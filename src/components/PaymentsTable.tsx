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
  SortingState,
  getSortedRowModel,
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
    id: 'date',
    header: () => 'Date',
  },
  {
    accessorKey: 'gross',
    id: 'gross',
    header: () => 'Gross Pay',
    cell: info => `$${info.getValue()}`,
  },
  {
    accessorKey: 'amount',
    id: 'net',
    header: () => 'Net Pay',
    cell: info => `$${info.getValue()}`,
  },
]

const PaymentsTable = (props: { overviewData: any, setSelectedData: any }) => {
  const [globalFilter, setGlobalFilter] = createSignal('');
  const [rowSelection, setRowSelection] = createSignal({});
  const [sorting, setSorting] = createSignal<SortingState>([{
    id: 'date',
    desc: true,
  }]);
  const debounceSetGlobalFilter = debounce(
    (value: string) => setGlobalFilter(value),
    500
  );

  const table = createSolidTable({
    get data() {
      if (props.overviewData()) {
        return props.overviewData().payments;
      }

      return [];
    },
    columns,
    state: {
      get rowSelection() {
        return rowSelection()
      },
      get globalFilter() {
        return globalFilter()
      },
      get sorting() {
        return sorting()
      }
    },
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: (selection) => {
      setRowSelection(selection);
      if (selection instanceof Function) {
        props.setSelectedData(selection(rowSelection()));
      } else {
        props.setSelectedData(selection);
      }
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
      class="tw:input tw:mt-2 tw:ml-2"
      value={globalFilter() ?? ''}
      onInput={e => debounceSetGlobalFilter(e.currentTarget.value)}
      placeholder="Search..."
    />

    <div class="tw:overflow-x-auto" style="height: 320px">
      <table class="tw:table tw:table-pin-rows tw:table-pin-cols">
        <thead>
          <For each={table.getHeaderGroups()}>
            {headerGroup => (
              <tr class="tw:sticky">
                <For each={headerGroup.headers}>
                  {header => (
                    <th colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : (
                        <div
                          class={
                            header.column.getCanSort()
                              ? 'tw:cursor-pointer tw:select-none'
                              : undefined
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="tw:inline tw:size-4">
                              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                            </svg>
                            ,
                            desc: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width={1.5} stroke="currentColor" class="tw:inline tw:size-4">
                              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                            ,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </th>
                  )}
                </For>
              </tr>
            )}
          </For>
        </thead>
        <tbody>
          <For each={table.getRowModel().rows}>
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
    </div>
  </div>;
};

export default PaymentsTable;