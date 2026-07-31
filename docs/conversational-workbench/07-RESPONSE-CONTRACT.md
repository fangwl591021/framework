# Response Contract

每個輸入都回傳 channel-neutral response：status、message、supportCode、actionRequired、retry policy、choices、safe summary、operation receipt 與 bounded provider-neutral presentation payload。

狀態為 understood、clarification_required、action_required、confirmation_required、processing、succeeded、failed、cancelled。錯誤只公開 allowlisted reason 與 opaque Support Code；不得包含 Stack、SQL、Secret、raw UID、完整名單、Buyer／Visitor reference 或 Provider payload。
