import { UserService } from './userService';
import { AuthService } from './authService';

const userService = new UserService();
const authService = new AuthService();

export async function handleLogin(req: any, res: any) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json(result);
}

export async function handleRegister(req: any, res: any) {
  const { email, password, name } = req.body;
  const user = await userService.createUser(email, password, name);
  res.status(201).json(user);
}

export async function handleGetUser(req: any, res: any) {
  const user = await userService.getUserById(req.params.id);
  res.json(user);
}

export async function handleLogout(req: any, res: any) {
  await authService.logout(req.headers.authorization);
  res.status(204).send();
}

export async function handleChangePassword(req: any, res: any) {
  await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  res.status(204).send();
}

export async function handleRequestReset(req: any, res: any) {
  await authService.requestPasswordReset(req.body.email);
  res.status(202).send();
}

export async function handleResetPassword(req: any, res: any) {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(204).send();
}
