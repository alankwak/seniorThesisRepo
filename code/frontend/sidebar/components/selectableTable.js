class SelectableTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.enabled = false;
  }

  connectedCallback() {
    this.data = this.data || [];
    if (this.isConnected) this.render();
  }

  set data(rows) {
    this._data = rows;
    this.render();
  }

  get data() {
    return this._data;
  }

  toggle() {
    this.clearSelection();
    this.enabled = !this.enabled;
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = this.enabled ? `
      <style>
        :host {
          display: block;
          font-family: system-ui, sans-serif;
        }
        .table-wrap {
          border: 1px solid #ddd;
          border-radius: 6px;
          max-height: 450px;
          overflow-x: hidden;
          overflow-y: scroll;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        thead th {
          background: #fafafa;
          border-bottom: 1px solid #ddd;
          padding: 8px 12px;
          text-align: left;
          font-size: 13px;
          color: #555;
        }
        tbody td {
          padding: 8px 12px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        tbody tr {
          cursor: pointer;
        }
        tbody tr:hover {
          background: #f5f7fa;
        }
        tbody tr[aria-selected="true"] {
          background: #e8f0ff;
        }
        .checkbox-cell {
          width: 42px;
          text-align: center;
        }
        .tab-title {
          font-weight: bold;
        }
        .tab-url {
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          display: block;
        }
      </style>

      <div class="table-wrap">
        <table>
            <colgroup>
            <col style="width: 10%">
            <col style="width: 10%">
            <col style="width: 80%">
          </colgroup>
          <thead>
            <tr>
              <th class="checkbox-cell"><input type="checkbox" id="select-all"></th>
              <slot name="header"></slot>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    ` : "";
    
    const tbody = this.shadowRoot.querySelector("tbody");
    if(tbody) {
      tbody.innerHTML = "";

      for (const row of this._data) {
        const tr = document.createElement("tr");
        tr.setAttribute("tabindex", "0");
        tr.setAttribute("aria-selected", "false");
        tr.dataset.id = row[0];

        tr.innerHTML = `
          <td class="checkbox-cell"><input type="checkbox"></td>
          <td> ${row[1]} </td>
          <td>
            <div>
              <div class="tab-title"> ${row[2]} </div>
              <div class="tab-url"> ${row[3]} </div>
            </div>
          </td>
        `;

        tbody.appendChild(tr);
      }

      this.attachBehavior();
    }
  }

  attachBehavior() {
    const rows = Array.from(this.shadowRoot.querySelectorAll("tbody tr"));
    const selectAll = this.shadowRoot.querySelector("#select-all");

    const update = () => {
      const selectedIds = rows
        .filter(r => r.getAttribute("aria-selected") === "true")
        .map(r => r.dataset.id);

      selectAll.checked = selectedIds.length === rows.length;
      selectAll.indeterminate = selectedIds.length > 0 && selectedIds.length < rows.length;

      this.dispatchEvent(new CustomEvent("selectionchange", { detail: { selectedIds } }));
    };

    rows.forEach(row => {
      row.onclick = () => {
        const selected = row.getAttribute("aria-selected") === "true";
        row.setAttribute("aria-selected", selected ? "false" : "true");
        row.querySelector("input[type='checkbox']").checked = !selected;
        update();
      };
    });

    selectAll.onclick = () => {
      const value = selectAll.checked;
      rows.forEach(row => {
        row.setAttribute("aria-selected", value ? "true" : "false");
        row.querySelector("input").checked = value;
      });
      update();
    };
  }

  getSelectedIds() {
    return Array.from(this.shadowRoot.querySelectorAll("tbody tr[aria-selected='true']"))
      .map(r => r.dataset.id);
  }

  clearSelection() {
    this.setSelectedIds([]);
  }

  setSelectedIds(ids) {
    const rows = Array.from(this.shadowRoot.querySelectorAll("tbody tr"));
    rows.forEach(row => {
      const isSelected = ids.includes(row.dataset.id);
      row.setAttribute("aria-selected", isSelected ? "true" : "false");
      row.querySelector("input").checked = isSelected;
    });
  }
}

customElements.define("selectable-table", SelectableTable);