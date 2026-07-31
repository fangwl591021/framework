# Navigation and Dashboard

Admin shell 從模組 manifest 建立導覽與 Dashboard，不硬編 Domain menu。

Event：活動管理、報名名單、核銷管理、活動統計。Business Network：商業網路、夥伴管理、推薦歸屬、銷售管理、佣金管理。

每個 item/card 都有穩定 key、route/destination、排序、required permission 與 feature/query key。輸出只包含已通過完整後端 Gate 的項目；隱藏 UI 不能取代 API/Service Gate。
