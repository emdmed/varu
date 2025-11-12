import { rm } from 'fs/promises';

export const deleteProject = async (projectPath) => {
	try {
		await rm(projectPath, { recursive: true, force: true });
		return { success: true };
	} catch (err) {
		return { success: false, error: err.message };
	}
};
