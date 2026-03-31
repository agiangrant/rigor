import { UserManager } from './userManager';

const userManager = new UserManager();

export async function handleLogin(req: any, res: any) {
  const { email, password } = req.body;
  const result = await userManager.login(email, password);
  res.json(result);
}

export async function handleRegister(req: any, res: any) {
  const { email, password, name } = req.body;
  const user = await userManager.createUser(email, password, name);
  res.status(201).json(user);
}

export async function handleGetUser(req: any, res: any) {
  const user = await userManager.getUserById(req.params.id);
  res.json(user);
}

export async function handleLogout(req: any, res: any) {
  await userManager.logout(req.headers.authorization);
  res.status(204).send();
}

export async function handleChangePassword(req: any, res: any) {
  await userManager.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  res.status(204).send();
}

export async function handleRequestReset(req: any, res: any) {
  await userManager.requestPasswordReset(req.body.email);
  res.status(202).send();
}

export async function handleResetPassword(req: any, res: any) {
  await userManager.resetPassword(req.body.token, req.body.newPassword);
  res.status(204).send();
}
