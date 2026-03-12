class NonselectableTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.data = this.data || [];
    this.minimized = this.data.length === 0;
    if (this.isConnected) this.render();
  }

  set data(rows) {
    this._data = rows;
    this.render();
  }

  get data() {
    return this._data;
  }

  set minimized(value) {
    this._minimized = Boolean(value);
    this.render();
  }

  get minimized() {
    return this._minimized;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, sans-serif;
        }
        .table-wrap {
          border: 1px solid #a7a7a7;
          border-radius: 0 10px 10px 10px;
          max-height: 30em;
          overflow-x: hidden;
          overflow-y: auto;
          background: rgb(255, 255, 255);
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        tbody td {
          padding: 8px 12px;
          border-bottom: 1px solid #c0c0c0;
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

      if(this.minimized) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td colspan="2" style="text-align: center; font-style: italic; color: #666;">${this.data.length} tab${this.data.length !== 1 ? "s" : ""}</td>
        `;
        tbody.appendChild(tr);
      } else {
        for(const row of this._data) {
          const tr = document.createElement("tr");
          tr.setAttribute("tabindex", "0");
          tr.dataset.id = row.id;

          tr.innerHTML = `
            <td> <img src="${row.favIconUrl}" /> </td>
            <td>
              <div>
                <div class="tab-title"> ${row.title} </div>
                <div class="tab-url"> <a href="${row.url}" target="_blank" rel="noreferrer" title="${row.url}">${row.url}</a> </div>
              </div>
            </td>
          `;

          tbody.appendChild(tr);
        }
      }
    }
  }

}

customElements.define("non-selectable-table", NonselectableTable);