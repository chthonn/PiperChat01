import { Headphones, MicOff, Settings } from "lucide-react";
import Navbar2Dashboard from "../friends/sidebar/Navbar2Dashboard";
import Navbar2Chat from "../chat/sidebar/Navbar2Chat";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { resolveProfilePic, handleImageError } from "../../shared/imageFallbacks";
import SettingsDialog from "../settings/SettingsDialog";

function Navbar2({ friends, onNavigate }) {
  const { server_id } = useParams();

  // user details from redux
  const username = useSelector((state) => state.user_info.username);
  const tag = useSelector((state) => state.user_info.tag);
  const rawProfilePic = useSelector((state) => state.user_info.profile_pic);
  const isInvisible = useSelector((state) => state.user_info.invisible_mode);
  const profile_pic = resolveProfilePic(rawProfilePic, username);

  function footerButton(label, Icon) {
    return (
      <button
        type="button"
        className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
        title={label}
        aria-label={label}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        {server_id == "@me" || server_id == undefined ? (
          <Navbar2Dashboard
            friends={friends}
            onNavigate={onNavigate}
          ></Navbar2Dashboard>
        ) : (
          <Navbar2Chat onNavigate={onNavigate}></Navbar2Chat>
        )}
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 bg-black/30 px-3 py-3">
        <div className="relative h-11 w-11 overflow-visible rounded-2xl border border-white/10 bg-black/40">
          <div className="h-11 w-11 overflow-hidden rounded-2xl">
            <img
              src={profile_pic}
              alt=""
              className="h-full w-full object-cover"
              onError={handleImageError}
            />
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 z-10 h-3.5 w-3.5 rounded-full border-2 border-panel2 ${isInvisible ? "bg-white/20" : "bg-emerald-400"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">
            {username}
          </div>
          <div className="text-xs font-semibold text-white/50">#{tag}</div>
        </div>
        <div className="flex items-center gap-2">
          {footerButton("Unmute", MicOff)}
          {footerButton("Deafen", Headphones)}
          <SettingsDialog
            icon={Settings}
            triggerClassName="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          />
        </div>
      </div>
    </div>
  );
}

export default Navbar2;
