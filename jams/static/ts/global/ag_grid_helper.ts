import { IDoesFilterPassParams, IFilterComp, IFilterParams, ValueFormatterParams } from "ag-grid-community";
import { debounce, isNullEmptyOrSpaces } from "./helper";

export function dateTimeFormatter(params:ValueFormatterParams) {
    const dateStr = params.value;
    const dateObj = new Date(dateStr);

    if (isNullEmptyOrSpaces(dateStr)) {
        return ''
    }

    if (!(dateObj)) {
      return dateStr;
    }

    const timezoneMatch = dateStr.match(/([A-Z]+)$/);
    const timezone = timezoneMatch ? timezoneMatch[1] : 'UTC';

    const options:Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: timezone
    };

    return new Intl.DateTimeFormat('default', options).format(dateObj);
  }

  export class StatusCodeFilter implements IFilterComp {
    eGui!: HTMLDivElement;
    chSuccess: any;
    chError: any;
    filterActive!: boolean;
    filterChangedCallback!: (additionalEventAttributes?: any) => void;
    filterSuccess: boolean = true;
    filterError: boolean = true;

    init(params: IFilterParams) {
        this.eGui = document.createElement('div');
        this.eGui.innerHTML = `<div class="card card-sm">
                <div class="form-label" style="margin-left:10px; margin-top:5px">Select Status Code Type</div>
                <div style="margin-left:10px; margin-top:5px">
                    <label class="form-check">  
                        <input class="form-check-input" type="checkbox" name="statusCodeFilter" checked="true" id="ch-Success" filter-checkbox="true"/>
                        <label class="form-check-label">Success</label>
                    </label>
                    <label class="form-check">   
                        <input class="form-check-input" type="checkbox" name="statusCodeFilter" checked=true id="ch-error" filter-checkbox="true"/>
                        <label class="form-check-label">Error</label>
                    </label>
                </div>
            </div>`;
        this.chSuccess = this.eGui.querySelector('#ch-Success');
        this.chError = this.eGui.querySelector('#ch-error');
        this.chSuccess.addEventListener('change', this.onRbChanged.bind(this));
        this.chError.addEventListener('change', this.onRbChanged.bind(this));
        this.filterActive = false;


        this.filterChangedCallback = debounce(params.filterChangedCallback, 300);
    }

    onRbChanged() {
        this.filterSuccess = this.chSuccess.checked;
        this.filterError = this.chError.checked;
        this.filterActive = this.filterSuccess || this.filterError;
        this.filterChangedCallback();
    }

    getGui() {
        return this.eGui;
    }

    doesFilterPass(params: IDoesFilterPassParams) {
        const statusCode = params.data.status_code;
        const isSuccess = statusCode >= 200 && statusCode < 300;
        const isError = statusCode >= 400 && statusCode < 600;

        if (this.filterSuccess && isSuccess) return true;
        if (this.filterError && isError) return true;

        return false;
    }

    isFilterActive() {
        return this.filterActive;
    }

    getModel() {
        if ((this.filterSuccess && this.filterError) || (!this.filterSuccess && !this.filterError)) {
            return null
        } else if (this.filterSuccess) {
            return [200]
        } else {
            return [400, 403, 500]
        }
    }

    setModel(model: any) {
        if (model) {
            this.filterSuccess = model.filterSuccess;
            this.filterError = model.filterError;
            this.chSuccess.checked = this.filterSuccess;
            this.chError.checked = this.filterError;
            this.filterActive = this.filterSuccess || this.filterError;
        }
    }
}