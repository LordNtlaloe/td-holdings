// components/user-avatar.tsx
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import defaultAvatar from "@/public/default-avatar.png";

interface UserAvatarProps {
    size?: number;
}

export default async function UserAvatar({ size = 50 }: UserAvatarProps) {
    const session = await authClient.getSession();
    const imageSrc = session?.data?.user?.image || defaultAvatar;

    if (!session?.data?.user) return null;

    return (
        <div className="rounded-full overflow-hidden">
            <Image 
                src={imageSrc}
                alt="User Avatar"
                width={size}
                height={size}
                className="object-cover"
            />
        </div>
    );
}