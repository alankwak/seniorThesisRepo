class NonselectableTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
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

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, sans-serif;
        }
        .table-wrap {
          border: 1px solid #ddd;
          max-height: 30em;
          overflow-x: hidden;
          overflow-y: auto;
          border-radius: 0px 0px 10px 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        tbody {
          background: #F9F9F9;
        }
        tbody td {
          padding: 8px 12px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        img {
          width: 20px;
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
            <col style="width: 90%">
          </colgroup>
          <thead></thead>
          <tbody></tbody>
        </table>
      </div>
    `;
    
    const tbody = this.shadowRoot.querySelector("tbody");
    if(tbody) {
      tbody.innerHTML = "";

      for (const row of this._data) {
        const tr = document.createElement("tr");
        tr.setAttribute("tabindex", "0");
        tr.dataset.id = row[0];

        tr.innerHTML = `
          <td> <img src="${row[1]}" /> </td>
          <td>
            <div>
              <div class="tab-title"> ${row[2]} </div>
              <div class="tab-url"> <a href="${row[3]}" target="_blank" rel="noreferrer" >${row[3]}</a> </div>
            </div>
          </td>
        `;

        tbody.appendChild(tr);
      }
    }
  }

}

customElements.define("non-selectable-table", NonselectableTable);