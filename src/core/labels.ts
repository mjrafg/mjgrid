/** UI strings. Korean defaults keep parity with the legacy grid; pass `labels` to MjProvider to override. */
export interface MjLabels {
  search: string; searchPlaceholder: string; clear: string; all: string
  add: string; addSuffix: string; save: string; delete: string; cancel: string; ok: string; confirm: string
  edit: string; view: string; register: string; update: string
  excelExport: string; excelImport: string; excelTemplate: string; print: string
  noData: string; noChanges: string
  saved: string; inserted: string; updated: string; deleted: string
  confirmDeleteTitle: string; confirmDeleteBody: string
  selectTitle: (name: string) => string
  pick: string; clearValue: string
  positive: string; negative: string
  uploadHint: string; uploadAccept: (formats: string) => string; uploadTooLarge: (max: string) => string; uploadBadType: string
  fileRegister: string; download: string; remove: string
  signature: string; stamp: string; signClear: string
  addressSearch: string
  rowAdd: string; rowRemove: string; rowNumber: string
  excelPreviewTitle: (name: string) => string; excelRowsFound: (n: number) => string
  errorPrefix: (rowNo: number) => string
  today: string; week: string; month: string
}

export const koLabels: MjLabels = {
  search: '검색', searchPlaceholder: '검색어 입력..', clear: '초기화', all: '전체',
  add: '등록', addSuffix: '등록', save: '저장', delete: '삭제', cancel: '취소', ok: 'OK', confirm: '확인',
  edit: '수정', view: '조회', register: '등록', update: '수정',
  excelExport: '엑셀다운로드', excelImport: '엑셀업로드', excelTemplate: '양식다운로드', print: '인쇄',
  noData: '데이터가 없습니다.', noChanges: '변경된 내용이 없습니다.',
  saved: '저장 되었습니다.', inserted: '등록 되었습니다.', updated: '수정 되었습니다.', deleted: '삭제 되었습니다.',
  confirmDeleteTitle: '삭제', confirmDeleteBody: '삭제하시겠습니까?',
  selectTitle: n => `${n} 선택`,
  pick: '선택', clearValue: '지우기',
  positive: '사용', negative: '미사용',
  uploadHint: '여기에 파일을 놓거나 클릭하여 업로드하세요.', uploadAccept: f => `허용 파일 확장자 [${f}]`,
  uploadTooLarge: m => `최대 ${m}까지 업로드할 수 있습니다.`, uploadBadType: '올바른 파일 확장자를 사용하여 업로드해 주십시오.',
  fileRegister: '파일등록', download: '다운로드', remove: '삭제',
  signature: '서명', stamp: '직인', signClear: '초기화',
  addressSearch: '주소검색',
  rowAdd: '행 추가', rowRemove: '행 삭제', rowNumber: 'NO',
  excelPreviewTitle: n => `${n} 엑셀업로드`, excelRowsFound: n => `${n}건`,
  errorPrefix: n => `NO${n}: `,
  today: '오늘', week: '일주일', month: '한달'
}

export const enLabels: MjLabels = {
  search: 'Search', searchPlaceholder: 'Search...', clear: 'Clear', all: 'All',
  add: 'Add', addSuffix: '', save: 'Save', delete: 'Delete', cancel: 'Cancel', ok: 'OK', confirm: 'Confirm',
  edit: 'Edit', view: 'View', register: 'Create', update: 'Update',
  excelExport: 'Export Excel', excelImport: 'Import Excel', excelTemplate: 'Template', print: 'Print',
  noData: 'No data.', noChanges: 'Nothing to save.',
  saved: 'Saved.', inserted: 'Created.', updated: 'Updated.', deleted: 'Deleted.',
  confirmDeleteTitle: 'Delete', confirmDeleteBody: 'Delete this record?',
  selectTitle: n => `Select ${n}`,
  pick: 'Pick', clearValue: 'Clear value',
  positive: 'Yes', negative: 'No',
  uploadHint: 'Drop a file here or click to upload.', uploadAccept: f => `Allowed: ${f}`,
  uploadTooLarge: m => `Maximum size is ${m}.`, uploadBadType: 'File type not allowed.',
  fileRegister: 'Choose file', download: 'Download', remove: 'Remove',
  signature: 'Signature', stamp: 'Stamp', signClear: 'Clear',
  addressSearch: 'Find address',
  rowAdd: 'Add row', rowRemove: 'Remove row', rowNumber: '#',
  excelPreviewTitle: n => `Import ${n} from Excel`, excelRowsFound: n => `${n} rows`,
  errorPrefix: n => `Row ${n}: `,
  today: 'Today', week: 'Week', month: 'Month'
}
