# Navigation and Dashboard

Admin shell 從模組 manifest 建立導覽與 Dashboard，不硬編 Domain menu。

Event：活動管理、報名名單、核銷管理、活動統計。Business Network：商業網路、夥伴管理、推薦歸屬、銷售管理、佣金管理。

每個 item/card 都有穩定 key、route/destination、排序、required permission 與 feature/query key。輸出只包含 Eligibility 通過的項目；它不呼叫 Traffic Admission、不消耗任何 traffic/resource/concurrency budget。Traffic throttling 不改變靜態可見性，但真正 Route/API/Service invocation 仍會被 Traffic 與 Module Invocation Guard 拒絕。

UI 隱藏不能取代 API/Service authorization。