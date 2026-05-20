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
        gap-4
        p-4
        bg-[#f8f4f1]
        overflow-hidden
      "
    >
      <div
        className="
          w-[340px]
          min-w-[340px]
          overflow-hidden
          rounded-3xl
          bg-white/80
          backdrop-blur-xl
          border
          border-[#eadfd8]
          shadow-sm
        "
      >
        <ConversationsSidebar />
      </div>

      <div
        className="
          flex-1
          overflow-hidden
          rounded-3xl
          bg-white/80
          backdrop-blur-xl
          border
          border-[#eadfd8]
          shadow-sm
        "
      >
        <ChatMessages />
      </div>

      <div
        className="
          w-[340px]
          min-w-[340px]
          overflow-hidden
          rounded-3xl
          bg-white/80
          backdrop-blur-xl
          border
          border-[#eadfd8]
          shadow-sm
        "
      >
        <CustomerPanel />
      </div>
    </div>
  );
}