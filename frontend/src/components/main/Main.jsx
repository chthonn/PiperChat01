import { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import MainDashboard from '../friends/main/MainDashboard';
import MainChat from '../chat/main/MainChat';
import socket from '../socket/Socket';
import { update_options } from '../../store/optionsSlice';
import { useDispatch, useSelector } from 'react-redux';
import discord_logo from '../../images/discord_logo_3.png'
import { resolveProfilePic, handleImageError } from '../../shared/imageFallbacks';
import DirectMessage from '../directMessages/DirectMessage';
import { X } from "lucide-react";


function Main({user_relations}) {
  const dispatch = useDispatch()
  const notificationPrefs = useSelector((state) => state.user_info.notification_preferences);
  const canReceiveFriendRequests = notificationPrefs?.friend_requests ?? true;
  const id = useSelector(state => state.user_info.id)
  const activeDirectMessage = useSelector(
    (state) => state.direct_message.activeFriend
  );

  const [req_popup, setreq_popup] = useState({state:'none' , value:false})
  const [req_popup_data, setreq_popup_data] = useState({profile_pic:'' , name:'' , notif_message:'' , id:null})

  const {server_id} = useParams()

  useEffect(()=>{
    if(id!=0){
      socket.emit('get_userid' , id)
    }
  },[id])

  useEffect(()=>{
    if(req_popup_data.id!=null){
      dispatch(update_options())
      setreq_popup((current) => ({ ...current, value: false }))
    }
    
  },[dispatch, req_popup_data.id])

  useEffect(() => {
    const handleReceiveReq = (message) => {
      if (!canReceiveFriendRequests) return;
      const {sender_name , sender_profile_pic , sender_id} =  message
      setreq_popup_data({name:sender_name , profile_pic:sender_profile_pic , id:sender_id , notif_message:'Sent you a friend Request'})
      setreq_popup({state:'flex' , value:true})
    };

    const handleAcceptedReq = (message) => {
      const {sender_id , friend_profile_pic ,friend_name} =  message
      setreq_popup_data({name:friend_name , profile_pic:friend_profile_pic , id:sender_id , notif_message:'Accepted your friend Request'})
      setreq_popup({state:'flex' , value:true})
    };

    const handleRequestUpdated = () => {
      dispatch(update_options());
    };

    socket.on('recieve_req', handleReceiveReq);
    socket.on('req_accepted_notif', handleAcceptedReq);
    socket.on('request_updated', handleRequestUpdated);

    return () => {
      socket.off('recieve_req', handleReceiveReq);
      socket.off('req_accepted_notif', handleAcceptedReq);
      socket.off('request_updated', handleRequestUpdated);
    };
  }, [dispatch, canReceiveFriendRequests]);

    
  return (
    <div className="relative h-full min-w-0">

    <>
        {
            server_id=='@me' ||server_id==undefined
              ? activeDirectMessage
                ? <DirectMessage />
                : <MainDashboard user_relations={user_relations}></MainDashboard>
              : <MainChat ></MainChat>

        }


    </>
      {req_popup.state === "flex" ? (
        <div className="pointer-events-none fixed right-4 top-4 z-50 w-[360px] max-w-[calc(100vw-2rem)]">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-zinc-950/70 p-3 shadow-soft backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-white/60">
                <img src={discord_logo} alt="" className="h-4 w-4 opacity-80" />
                PIPERCHAT
              </div>
              <button
                type="button"
                onClick={() => setreq_popup({ ...req_popup, state: "none" })}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                <img
                  src={resolveProfilePic(req_popup_data.profile_pic, req_popup_data.name)}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={handleImageError}
                />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-white">
                  {req_popup_data.name}
                </div>
                <div className="text-xs font-semibold text-white/60">
                  {req_popup_data.notif_message}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>


  );
}

export default Main
