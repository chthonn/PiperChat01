import discord_logo from "../../images/discord_logo_3.png";
import { ChevronRight, Plus, ArrowLeft, Loader2 } from "lucide-react";
import server_img_1 from "../../images/new_server.svg";
import server_img_2 from "../../images/server_image_2.svg";
import server_img_3 from "../../images/server_image_3.svg";
import server_img_4 from "../../images/server_image_4.svg";
import server_img_5 from "../../images/server_image_5.svg";
import server_img_6 from "../../images/server_image_6.svg";
import server_img_7 from "../../images/server_image_7.svg";
import server_input from "../../images/server_image_input.svg";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { server_role } from "../../store/currentPage";
import { v4 as uuidv4 } from "uuid";
import { supabase, getSupabaseBucket } from "../../lib/supabaseClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { close_direct_message } from "../../store/directMessageSlice";
import { API_BASE_URL } from "../../config";

const MAX_SERVER_NAME_LENGTH = 100;

function Navbar({ new_req_recieved, user_cred, onNavigate }) {
  const dispatch = useDispatch();
  const unreadServers = useSelector((state) => state.unread.servers);
  const unreadDm = useSelector((state) => state.unread.dm);
  const { server_id: activeServerId } = useParams();

  const { username, user_servers } = user_cred;
  const servers = Array.isArray(user_servers) ? user_servers : [];

  const [show, setShow] = useState(false);
  const handleClose = () => {
    setShow(false);
    setcurrent_modal(1);
    setsubmit_button({ create_button_state: false, back_button_state: false });
    setnew_server_image_preview(server_input);
  };
  const handleShow = () => setShow(true);
  const template = [
    { text: "Create My Own", image: server_img_1 },
    { text: "Gaming", image: server_img_2 },
    { text: "School Club", image: server_img_3 },
    { text: "Study Group", image: server_img_4 },
    { text: "Friends", image: server_img_5 },
    { text: "Artists & Creators", image: server_img_6 },
    { text: "Local Community", image: server_img_7 },
  ];
  const [server_details, setserver_details] = useState({
    name: `${username}'s server`,
    type: "",
    key: 0,
    role: "author",
  });
  const [current_modal, setcurrent_modal] = useState(1);
  const [submit_button, setsubmit_button] = useState({
    create_button_state: false,
    back_button_state: false,
  });
  const [new_server_image_preview, setnew_server_image_preview] =
    useState(server_input);
  const [new_server_image, setnew_server_image] = useState("");

  function update_server_pic(e) {
    let file = e.target.files[0];
    if (!file) {
      return;
    }
    setnew_server_image_preview(URL.createObjectURL(file));
    setnew_server_image(file);
  }

  const upload_server_image = async () => {
    if (!new_server_image) {
      return "";
    }

    if (!supabase) {
      console.warn("Supabase is not configured; skipping server image upload.");
      return "";
    }

    const bucket = getSupabaseBucket();
    const fileExt =
      new_server_image.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `server-icons/${uuidv4()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, new_server_image, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload server image", uploadError);
      return "";
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl || "";
  };

  const create_server = async () => {
    const image_url = await upload_server_image();

    const res = await fetch(`${API_BASE_URL}/servers/create_server`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        server_details,
        server_image: image_url,
      }),
    });
    const data = await res.json();
    if (data.status === 200) {
      handleClose();
      new_req_recieved(1);
    }
  };

  const dmUnreadTotal = Object.values(unreadDm).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="flex h-full flex-col items-center gap-3 px-2 py-3">
      <Link
        to="/channels/@me"
        onClick={() => {
          dispatch(close_direct_message());
          onNavigate?.();
        }}
        className={[
          "group relative grid h-12 w-12 place-items-center overflow-visible rounded-2xl border transition-all duration-200",
          activeServerId === "@me" || !activeServerId
            ? "border-brand-400/40 bg-brand-400/10 text-brand-300 drop-shadow-md"
            : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
        ].join(" ")}
        title="Home"
      >
        <span className="relative z-10 grid h-12 w-12 place-items-center overflow-hidden rounded-2xl">
          <img src={discord_logo} alt="PiperChat" className="h-11 w-11" />
        </span>
        {dmUnreadTotal ? (
          <span className="absolute -right-1 -top-1 z-20 grid h-6 min-w-6 place-items-center rounded-full bg-brand-400 px-2 text-[11px] font-black text-black shadow-soft">
            {dmUnreadTotal}
          </span>
        ) : null}
      </Link>

      <div className="h-px w-10 bg-white/10" />

      <div className="flex flex-1 flex-col items-center gap-3 overflow-y-auto pb-2">
        {servers
          .filter((s) => s?.server_id)
          .map((elem) => {
            const isActive = String(activeServerId) === String(elem.server_id);
            const unread = unreadServers[elem.server_id]?.total;

            return (
              <Link
                key={elem.server_id}
                to={`/channels/${elem.server_id}`}
                onClick={() => {
                  dispatch(server_role(elem.server_role));
                  onNavigate?.();
                }}
                className={[
                  "group relative grid h-12 w-12 place-items-center overflow-visible rounded-2xl border text-sm font-extrabold",
                  isActive
                    ? "border-neon-cyan/45 bg-neon-cyan/10 text-neon-cyan"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
                ].join(" ")}
                title={elem.server_name}
              >
                {elem.server_pic ? (
                  <span className="absolute inset-0 overflow-hidden rounded-2xl">
                    <img
                      src={elem.server_pic}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : (
                  <span className="relative z-10 select-none">
                    {String(elem.server_name || "S").slice(0, 1).toUpperCase()}
                  </span>
                )}

                {unread ? (
                  <span className="absolute -right-1 -top-1 z-20 grid h-6 min-w-6 place-items-center rounded-full bg-brand-400 px-2 text-[11px] font-black text-black shadow-soft">
                    {unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
      </div>

      <button
        type="button"
        onClick={handleShow}
        className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
        title="Create server"
        aria-label="Create server"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={show} onOpenChange={(open) => (open ? setShow(true) : handleClose())}>
        <DialogContent className="max-w-lg">
          {current_modal === 1 ? (
            <>
              <DialogTitle>Create a server</DialogTitle>
              <DialogDescription className="mt-2">
                Your server is where you and your friends hang out. Make yours and
                start talking.
              </DialogDescription>

              <div className="mt-4 grid gap-2">
                {template.map((elem, index) => (
                  <button
                    key={`${elem.text}-${index}`}
                    type="button"
                    onClick={() => {
                      setserver_details({
                        ...server_details,
                        type: elem.text,
                        key: index + 1,
                      });
                      setcurrent_modal(2);
                    }}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    <span className="flex items-center gap-3">
                      <img src={elem.image} alt="" className="h-7 w-7" />
                      {elem.text}
                    </span>
                    <ChevronRight className="h-5 w-5 text-white/50" />
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {current_modal === 2 ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle>Tell us more</DialogTitle>
                  <DialogDescription className="mt-2">
                    Is your new server for a few friends or a larger community?
                  </DialogDescription>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {template.slice(-2).map((elem, index) => (
                  <button
                    key={`${elem.text}-${index}`}
                    type="button"
                    onClick={() => setcurrent_modal(3)}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    <span className="flex items-center gap-3">
                      <img src={elem.image} alt="" className="h-7 w-7" />
                      {elem.text}
                    </span>
                    <ChevronRight className="h-5 w-5 text-white/50" />
                  </button>
                ))}
              </div>

              <div className="mt-4 text-sm text-white/60">
                Not sure? You can{" "}
                <button
                  type="button"
                  onClick={() => setcurrent_modal(3)}
                  className="font-semibold text-brand-300 hover:text-brand-200"
                >
                  skip this question
                </button>{" "}
                for now.
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setcurrent_modal(1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="button" onClick={() => setcurrent_modal(3)}>
                  Continue
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {current_modal === 3 ? (
            <>
              <DialogTitle>Customize your server</DialogTitle>
              <DialogDescription className="mt-2">
                Give your server a name and an icon. You can always change it
                later.
              </DialogDescription>

              <div className="mt-4 flex items-center gap-4">
                <label
                  htmlFor="update_cover_pic"
                  className="group relative grid h-16 w-16 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                  title="Upload icon"
                >
                  <img
                    src={new_server_image_preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 transition group-hover:opacity-100" />
                  <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                </label>
                <input
                  onChange={update_server_pic}
                  type="file"
                  id="update_cover_pic"
                  name="image"
                  hidden
                />

                <div className="flex-1 space-y-2">
                  <div className="text-xs font-extrabold tracking-widest text-white/45">
                    <div className="flex items-center justify-between">
                      <span>SERVER NAME</span>
                      <span>
                        {server_details.name.length}/{MAX_SERVER_NAME_LENGTH}
                      </span>
                    </div>
                  </div>
                  <Input
                    value={server_details.name}
                    onChange={(e) =>
                      setserver_details({
                        ...server_details,
                        name: e.target.value,
                      })
                    }
                    maxLength={MAX_SERVER_NAME_LENGTH}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={submit_button.back_button_state}
                  onClick={() => setcurrent_modal(2)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={submit_button.create_button_state}
                  onClick={() => {
                    create_server();
                    setsubmit_button({
                      create_button_state: true,
                      back_button_state: true,
                    });
                  }}
                >
                  {submit_button.create_button_state ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Navbar;
