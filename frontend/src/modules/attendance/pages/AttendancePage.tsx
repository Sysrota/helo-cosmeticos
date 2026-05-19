import { ConversationsSidebar }
  from "../components/ConversationsSidebar";

import { ChatMessages }
  from "../components/ChatMessages";

import { CustomerPanel }
  from "../components/CustomerPanel";

export function AttendancePage() {
  return (
    <div
      className="
        h-[calc(100vh-170px)]
        flex
        bg-[#F2F2E1]
        overflow-hidden
      "
    >
      <div
        className="
          w-[340px]
          min-w-[340px]
          border-r
          border-white/10
          overflow-hidden
          flex
          flex-col
        "
      >
        <ConversationsSidebar />
      </div>

      <div
        className="
          flex-1
          overflow-hidden
          flex
          flex-col
        "
      >
        <ChatMessages />
      </div>

      <div
        className="
          w-[340px]
          min-w-[340px]
          border-l
          border-white/10
          overflow-hidden
          flex
          flex-col
        "
      >
        <CustomerPanel />
      </div>
    </div>
  );
}