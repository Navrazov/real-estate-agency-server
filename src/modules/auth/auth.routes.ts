import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from './auth.service.js';
import { authLimiter } from '../../middlewares/rate-limit.middleware.js';
import { sendMessage, requestContact, removeKeyboard } from '../../shared/telegram.js';

const router = Router();

const loginValidation = [
  body('phone')
    .notEmpty().withMessage('Укажите номер телефона')
    .isString()
    .trim(),
  body('password').notEmpty().withMessage('Укажите пароль'),
];

const registerValidation = [
  body('phone')
    .notEmpty().withMessage('Укажите номер телефона')
    .isString()
    .trim()
    .matches(/^\+?\d{7,15}$/).withMessage('Неверный формат номера'),
  body('password').notEmpty().withMessage('Укажите пароль'),
  body('firstName').notEmpty().withMessage('Укажите имя').isString().trim(),
  body('lastName').notEmpty().withMessage('Укажите фамилию').isString().trim(),
  body('code').notEmpty().withMessage('Укажите код подтверждения').isString().trim(),
  body('phoneHidden').optional().isBoolean(),
];

const sendCodeValidation = [
  body('phone')
    .notEmpty().withMessage('Укажите номер телефона')
    .isString()
    .trim()
    .matches(/^\+?\d{7,15}$/).withMessage('Неверный формат номера'),
  body('method')
    .optional()
    .isIn(['call', 'telegram']).withMessage('Метод должен быть "call" или "telegram"'),
  body('checkExists')
    .optional()
    .isBoolean(),
  body('mustExist')
    .optional()
    .isBoolean(),
];

router.post(
  '/send-code',
  authLimiter,
  sendCodeValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await authService.sendCode(req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/verify-code',
  authLimiter,
  [
    body('phone')
      .notEmpty().withMessage('Укажите номер телефона')
      .isString()
      .trim()
      .matches(/^\+?\d{7,15}$/).withMessage('Неверный формат номера'),
    body('code').notEmpty().withMessage('Укажите код').isString().trim(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await authService.verifyCode(req.body.phone, req.body.code);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/register',
  authLimiter,
  registerValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/login',
  authLimiter,
  loginValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await authService.login(req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('phone')
      .notEmpty().withMessage('Укажите номер телефона')
      .isString()
      .trim()
      .matches(/^\+?\d{7,15}$/).withMessage('Неверный формат номера'),
    body('code').notEmpty().withMessage('Укажите код').isString().trim(),
    body('newPassword')
      .notEmpty().withMessage('Укажите новый пароль')
      .isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await authService.resetPassword(req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

// ── Telegram auth ──

router.post('/telegram/init', authLimiter, (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = authService.telegramInit();
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/telegram/webhook',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const update = req.body;
      const message = update?.message;
      if (!message) return res.json({ ok: true });

      const chatId = message.chat?.id;
      const from = message.from;
      if (!chatId || !from?.id) return res.json({ ok: true });

      // Handle /start <nonce> — auth flow
      if (message.text?.startsWith('/start ')) {
        const nonce = message.text.slice(7).trim();
        if (!nonce) return res.json({ ok: true });

        const result = await authService.telegramCallback(
          String(from.id),
          from.first_name || '',
          from.last_name || '',
          from.username,
          nonce,
        );

        if (result) {
          const name = from.first_name || 'друг';
          await sendMessage(chatId,
            `\u2705 <b>${name}, вы успешно авторизованы!</b>\n\nВернитесь в приложение — вход выполнен.`
          );

          if (result.isNew) {
            await requestContact(chatId,
              '\uD83D\uDCF2 Поделитесь номером телефона, чтобы другие пользователи могли с вами связаться.\n\nНажмите кнопку ниже:'
            );
          }
        } else {
          await sendMessage(chatId, '\u274C Сессия истекла. Попробуйте войти заново через приложение.');
        }

        return res.json({ ok: true });
      }

      // Handle contact sharing — save phone
      if (message.contact) {
        const phone = message.contact.phone_number;
        if (phone) {
          await authService.telegramSavePhone(String(from.id), phone);
          await removeKeyboard(chatId,
            `\u2705 Номер <b>${phone}</b> сохранён в вашем профиле!\n\n` +
            'Теперь покупатели смогут связаться с вами напрямую.'
          );
        }
        return res.json({ ok: true });
      }

      // Handle any other message
      await sendMessage(chatId,
        '\uD83C\uDFE0 <b>EstateHub</b> — платформа недвижимости.\n\n' +
        'Чтобы войти, нажмите «Войти через Telegram» в приложении или на сайте.'
      );

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/telegram/check/:nonce', authLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = authService.telegramCheck(req.params.nonce);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export const authRoutes = router;
