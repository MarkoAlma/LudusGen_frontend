import React from "react";
import { useContext } from "react";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import { MyUserContext } from "../context/MyUserProvider";
import { useNavigate } from "react-router-dom";

const MyToastify = ({ err, katt, resetPw, kijelentkezes, torles }) => {

    const {setMsg} = useContext(MyUserContext)
    const navigate = useNavigate()

    useEffect(()=>{

        if (err) {
            toast.error(err, {position:'top-center', autoClose:1250})

        }else if (katt) {
            // navigate('/signin')
            let alma = katt
            toast.success(alma, {position:'top-center', autoClose:2500})
            //setMsg(prev => delete prev.katt)
            //setMsg({})
            // setTimeout(()=> {
            //     navigate('/signin')
            //     setMsg({})
            // }, 2000)
        }else if (kijelentkezes) {
          toast.success(kijelentkezes, {position:'top-center', autoClose:1250})
          console.log("kijelent");
          setMsg({})
        }else if (torles) {
          toast.success(torles, {position:'top-center', autoClose:2500})
          console.log("tor");
          setMsg({})
        }
        else if (resetPw) {
            // navigate('/signin')
            toast.success(resetPw, {position:'top-center', autoClose:2500})
        }
    },[err, katt, resetPw, kijelentkezes, torles])

  return (
    <div>
      <ToastContainer />
    </div>
  );
};

export default MyToastify;
