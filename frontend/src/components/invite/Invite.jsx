import { useCallback, useEffect, useState } from "react";
import logo from "../../images/logo.png";
import { useParams } from "react-router-dom";
import invalid_link_image from "../../images/invalid_invite.svg";
import jwt from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { API_BASE_URL } from "../../config";

function Invite() {
  const navigate = useNavigate();
  const token1 = localStorage.getItem("token");
  const user_creds = token1 ? jwt(token1) : null;
  const { username, tag, profile_pic, id } = user_creds || {};

  const { invite_link } = useParams();
  const url = API_BASE_URL;
  const [invite_details, setinvite_details] = useState(null);
  const [invalid_invite_link, setinvalid_invite_link] = useState(null);

const [already_member, setAlreadyMember] = useState(false);   // 403 from backend
  const accept_invite = async () => {
    setAlreadyMember(false);

    try {
      const res = await fetch(`${url}/invites/accept_invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({
          user_details: { username, tag, profile_pic, id },
          server_details: { invite_details },
        }),
      });
      const data = await res.json();

      if (data.status == 200) {
        navigate("/channels/@me", { replace: true });
      } else if (data.status === 403) {
        setAlreadyMember(true);
      }
    } catch {
      return;
    }
  };

  const invite_link_info = useCallback(async () => {
    const res = await fetch(`${url}/invites/invite_link_info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        invite_link,
      }),
    });
    const data = await res.json();
    if (data.status == 200) {
      setinvite_details(data);
      setinvalid_invite_link(false);
    } else {
      setinvalid_invite_link(true);
    }
  }, [invite_link, url]);

  useEffect(() => {
    invite_link_info();
  }, [invite_link_info]);

  return (
    <div className="min-h-dvh bg-ink text-white">
      <div className="pointer-events-none fixed inset-0 bg-radial-glow" />
      <div className="pointer-events-none fixed inset-0 bg-grid-fade [background-size:36px_36px] opacity-15" />

      <div className="relative grid min-h-dvh place-items-center p-6">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/40 p-6 shadow-soft backdrop-blur-xl sm:p-8">
          {invalid_invite_link == null ? (
            <div className="flex items-center gap-3 text-white/70">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-brand-400" />
              <div className="text-sm font-semibold">Loading invite…</div>
            </div>
          ) : invalid_invite_link == false ? (
            invite_details == null ? (
              <div className="flex items-center gap-3 text-white/70">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-brand-400" />
                <div className="text-sm font-semibold">Loading details…</div>
              </div>
              ) : already_member ? (
              //dedicated "already a member" state
              // shown when backend returns 403
              <div className="space-y-5 text-center">
                <div className="flex items-center justify-center">
                  <img src={logo} alt="PiperChat" className="h-12 w-12" />
                </div>
                <div className="text-xl font-extrabold tracking-tight">
                  You&aposre already a member
                </div>
                <div className="text-sm text-white/60">
                  You already belong to{" "}
                  <span className="font-bold text-white/85">
                    {invite_details.server_name}
                  </span>
                  . Head back to continue the conversation.
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() =>
                    navigate(
                      `/channels/${invite_details.server_id}`,
                      { replace: true }
                    )
                  }
                >
                  Go to server
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  size="lg"
                  onClick={() => navigate("/channels/@me", { replace: true })}
                >
                  Go to dashboard
                </Button>
              </div>

            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <img src={logo} alt="PiperChat" className="h-12 w-12" />
                </div>

                <div className="text-center">
                  <div className="text-xs font-extrabold tracking-widest text-white/50">
                    INVITE
                  </div>
                  <div className="mt-2 text-2xl font-extrabold tracking-tight">
                    {invite_details.inviter_name} invited you to join
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-lg font-black text-white">
                    {invite_details.server_pic == "" ? (
                      String(invite_details.server_name || "S")
                        .slice(0, 1)
                        .toUpperCase()
                    ) : (
                      <img
                        className="h-full w-full object-cover"
                        src={invite_details.server_pic}
                        alt=""
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold text-white/85">
                      {invite_details.server_name}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs font-semibold text-white/50">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        1 Online
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
                        1 Member
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    if (!token1) {
                      navigate("/", { replace: true });
                      return;
                    }
                    if (invite_details.inviter_id == id) {
                      navigate("/channels/@me", { replace: true });
                    } else {
                      accept_invite();
                    }
                  }}
                >
                  Accept invite
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-5 text-center">
              <img
                src={invalid_link_image}
                alt=""
                className="mx-auto h-44 w-auto opacity-90"
              />
              <div className="text-xl font-extrabold tracking-tight">
                Invite invalid
              </div>
              <div className="text-sm text-white/60">
                This invite may be expired or you might not have permission to
                join.
              </div>
              <Button
                variant="secondary"
                className="w-full"
                size="lg"
                onClick={() => navigate("/", { replace: true })}
              >
                Continue to PiperChat
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Invite;
