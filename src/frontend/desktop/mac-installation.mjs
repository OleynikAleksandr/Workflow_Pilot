export async function offerMacInstallation({ app, dialog, fresh }) {
  if (!fresh || app.isInApplicationsFolder()) return false;
  const choice = await dialog.showMessageBox({
    type: 'question', title: 'Установка Workflow Pilot',
    message: 'Установить Web Pilot в «Программы»?',
    detail: 'Приложение само переместится в папку Applications и откроется снова. Перетаскивать файлы вручную не нужно.',
    buttons: ['Установить', 'Пока пропустить'], defaultId: 0, cancelId: 1,
  });
  if (choice.response !== 0) return false;
  try {
    return app.moveToApplicationsFolder({ conflictHandler: () => dialog.showMessageBoxSync({
      type: 'question', title: 'Workflow Pilot',
      message: 'В «Программах» уже есть Workflow Pilot.',
      detail: 'Заменить его этой версией? Существующие проекты и настройки сохранятся.',
      buttons: ['Заменить', 'Отмена'], defaultId: 1, cancelId: 1,
    }) === 0 });
  } catch {
    dialog.showErrorBox('Перемещение не выполнено', 'Web Pilot продолжит работу из текущей папки. Позже скопируйте полное приложение в Applications через Finder.');
    return false;
  }
}
