import { ConversationsSidebar } from "../components/ConversationsSidebar";

import { ChatMessages } from "../components/ChatMessages";
import { CustomerPanel } from "../components/CustomerPanel";


export function AttendancePage() {
  return (
    <div
        className="
          flex
          h-[calc(100vh-80px)]
          bg-[#111b21]
          overflow-hidden
        "
      >
     <div className="w-80 p-4 overflow-hidden">
        <ConversationsSidebar />
      </div>

     <div className="flex-1 p-4 overflow-hidden">
        <ChatMessages />
      </div>

      <div className="w-80 p-4 overflow-hidden">
        <CustomerPanel />
      </div>
    </div>
  );
}