import api from "./api";

export const shredFiles = (fileIds) => {
    return api.post("/files/shred", { fileIds });
};
