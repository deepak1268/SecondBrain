import { useRef, useState } from "react"
import { InputBox } from "../components/InputBox"
import { Button } from "../components/button"
import axios from "axios";
import { BACKEND_URL } from "../config";


export const Signup = () => {
    const [loading,setLoading] = useState(false);
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    async function signup(){
        setLoading(true)
        try{
            const username = usernameRef.current?.value;
            const password = passwordRef.current?.value;
            console.log(`${BACKEND_URL}/api/v1/signup`)
            await axios.post(`${BACKEND_URL}/api/v1/signup`,{username,password});
            alert("Successfuly signed up.")
        } catch(err){
            console.error(err);
            alert("User already exists.")
        } finally{
            setLoading(false)
        }   
    }

    return <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="flex flex-col justify-center items-center w-full max-w-md bg-white p-10 shadow-xl rounded-lg">
            <InputBox text="Username" reference={usernameRef} placeholder="Enter Username"></InputBox>
            <InputBox text="Password" reference={passwordRef} placeholder="Enter Password"></InputBox>
            <br />
            <Button disabled={loading} size="lg" variant="secondary" text="Sign Up" fullWidth={true} onClick={signup}></Button>
        </div>
    </div>
}