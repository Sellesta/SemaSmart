import { currentUser } from "@clerk/nextjs/server";

export const isAdmin = async () => {
    const user = await currentUser();
    return user?.publicMetadata.role === "admin";
}