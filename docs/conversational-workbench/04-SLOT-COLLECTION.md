# Slot Collection

支援 string、integer、boolean、date、datetime、enum、application reference、module reference 與 support code。每個 Slot 具長度、格式、範圍與 allowlist validation；Secret、Token、Cookie、raw UID 類欄位被拒絕。

已驗證值不重問。修正資料會把舊 revision 標為 superseded 並新增 immutable current revision；Plan 只使用驗證後 bounded snapshot。Event create 收集名稱、開始、結束、名額與 optional location，不提供動態表單編輯器。
