import { auth } from "@clerk/nextjs/server";

const adminIds = [
    "user_3KN0sClD3pTFNYluInjbuuLqCqn",
];

export const isAdmin = () => {
    const { userId } = auth();

    if (!userId) {
        return false;
    }

    return adminIds.indexOf(userId) !== -1;
}