import { UserMinus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { resolveProfilePic, handleImageError } from "../../../shared/imageFallbacks";
import { server_members } from "../../../store/currentPage";
import { API_BASE_URL } from "../../../config";

function RightnavChat() {
  const dispatch = useDispatch();
  const { server_id } = useParams();
  const all_users = useSelector((state) => state.currentPage.members);
  const onlineUsers = useSelector((state) => state.presence.byId);
  const currentUserId = useSelector((state) => state.user_info.id);
  const serverRole = useSelector((state) => state.currentPage.role);
  const isServerOwner = serverRole === "author";

  const removeMember = async (memberId) => {
    const res = await fetch(`${API_BASE_URL}/servers/remove_member`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        server_id,
        member_id: memberId,
      }),
    });

    const data = await res.json();
    if (data.status === 200) {
      dispatch(
        server_members(
          all_users.filter((member) => String(member.user_id) !== String(memberId)),
        ),
      );
    }
  };

  return (
    <div className="h-full p-4">
      <div className="text-xs font-extrabold tracking-widest text-white/45">
        ALL MEMBERS — {all_users.length}
      </div>
      <div className="mt-3 space-y-2">
        {all_users.map((elem) => {
          const memberId = String(elem.user_id || elem._id || elem.id);
          const isOnline = Boolean(onlineUsers[memberId]);

          return (
            <div
              className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-white/10 hover:bg-white/5"
              key={elem.user_id || elem._id || elem.user_name}
            >
              <div className="relative h-10 w-10 overflow-visible rounded-2xl border border-white/10 bg-black/40">
                <div className="h-10 w-10 overflow-hidden rounded-2xl">
                  <img
                    src={resolveProfilePic(elem.user_profile_pic, elem.user_name)}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={handleImageError}
                  />
                </div>
                <span
                  className={[
                    "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-panel2",
                    isOnline ? "bg-emerald-400" : "bg-white/20",
                  ].join(" ")}
                />
              </div>
              <div className="min-w-0 flex-1 truncate">{elem.user_name}</div>
              {isServerOwner && String(memberId) !== String(currentUserId) ? (
                <button
                  type="button"
                  onClick={() => removeMember(memberId)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-400/15 bg-red-500/10 text-red-200 opacity-0 transition hover:bg-red-500/20 hover:text-red-100 group-hover:opacity-100 focus:opacity-100"
                  title="Remove member"
                  aria-label={`Remove ${elem.user_name}`}
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RightnavChat;
