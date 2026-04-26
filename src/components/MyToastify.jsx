import React, { useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import { MyUserContext } from "../context/MyUserProvider";
import { AlertTriangle, CheckCircle2, LogOut, MailCheck, Trash2 } from "lucide-react";

const toastBaseOptions = {
  position: "top-center",
  closeButton: false,
  hideProgressBar: false,
  pauseOnHover: true,
  pauseOnFocusLoss: false,
  draggable: true,
  theme: "dark",
  icon: false,
};

const ToastContent = ({ icon: Icon, title, detail }) => (
  <div className="ludus-toast-content">
    <div className="ludus-toast-icon">
      <Icon size={18} strokeWidth={2.4} />
    </div>
    <div className="ludus-toast-copy">
      <p className="ludus-toast-title">{title}</p>
      {detail && <p className="ludus-toast-detail">{detail}</p>}
    </div>
  </div>
);

const showLudusToast = ({ type = "success", tone = "success", title, detail, icon, autoClose, toastId }) => {
  const notify = type === "error" ? toast.error : toast.success;

  notify(
    <ToastContent icon={icon} title={title} detail={detail} />,
    {
      ...toastBaseOptions,
      autoClose,
      toastId,
      className: `ludus-toast ludus-toast--${tone}`,
      progressClassName: "ludus-toast-progress",
      bodyClassName: "ludus-toast-body",
    }
  );
};

const MyToastify = ({ err, katt, resetPw, resetSent, kijelentkezes, torles, signIn }) => {

    const {setMsg} = useContext(MyUserContext)

    useEffect(()=>{

        if (err) {
            showLudusToast({
              type: "error",
              tone: "error",
              title: "Hiba történt",
              detail: err,
              icon: AlertTriangle,
              autoClose: 1800,
              toastId: "ludus-error",
            });
            setTimeout(() => {
              setMsg({})
            }, 50);
        }else if (katt) {
            showLudusToast({
              title: "Ellenőrizd az emailed",
              detail: katt,
              icon: MailCheck,
              autoClose: 3000,
              toastId: "ludus-email-check",
            });
            setMsg({})
        }else if (kijelentkezes) {
          showLudusToast({
            title: signIn ? "Sikeres bejelentkezés" : "Sikeres kijelentkezés",
            detail: signIn ? "Üdv újra a LudusGenben." : kijelentkezes,
            icon: signIn ? CheckCircle2 : LogOut,
            autoClose: signIn ? 2400 : 1600,
            toastId: signIn ? "ludus-sign-in" : "ludus-sign-out",
          });
          setMsg({})
        }else if (torles) {
          showLudusToast({
            title: "Törlés kész",
            detail: torles,
            icon: Trash2,
            autoClose: 2500,
            toastId: "ludus-delete",
          });
          setMsg({})
        }
        else if (resetPw || resetSent) {
            showLudusToast({
              title: "Email elküldve",
              detail: resetPw || resetSent,
              icon: MailCheck,
              autoClose: 2800,
              toastId: "ludus-reset-password",
            });
            setMsg({})
        }
    },[err, katt, resetPw, resetSent, kijelentkezes, torles, signIn, setMsg])

  return (
    <div>
      <ToastContainer
        className="ludus-toast-container"
        newestOnTop
        limit={3}
      />
    </div>
  );
};

export default MyToastify;
