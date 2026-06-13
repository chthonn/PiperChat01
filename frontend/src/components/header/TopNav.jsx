import TopnavChat from "../chat/header/TopnavChat";
import TopnavDashboard from "../friends/header/TopnavDashboard";
import { useParams } from "react-router-dom";

function TopNav({ button_status, onToggleSidebar }) {
  const { server_id } = useParams();

  return (
    <div className="h-full">
      {server_id == "@me" || server_id === "explore" ? (
        <TopnavDashboard
          button_status={button_status}
          onToggleSidebar={onToggleSidebar}
        ></TopnavDashboard>
      ) : (
        <TopnavChat onToggleSidebar={onToggleSidebar}></TopnavChat>
      )}
    </div>
  );
}

export default TopNav;
