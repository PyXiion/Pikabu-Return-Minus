import * as SettingEnums from "./enums";

/**
 * Declarative description of every setting. config.ts turns it into GM_config
 * fields and ui.ts renders it. Keys are persisted by GM_config: NEVER rename them.
 *
 * Note: some legacy keys contain a CYRILLIC capital "С" (\u0421) instead of a latin "C".
 */

interface FieldBase {
  key: string;
  /** Short name shown as the row title */
  title: string;
  /** Longer explanation shown under the title */
  desc?: string;
}

export type FieldDef =
  | (FieldBase & { type: "checkbox"; default: boolean })
  | (FieldBase & { type: "int" | "number"; default: number })
  | (FieldBase & {
      type: "text";
      default: string;
      /** Returns an error message for an invalid value, or null if it is fine */
      validate?: (value: string) => string | null;
    })
  | (FieldBase & { type: "select"; default: string; options: string[] })
  | (FieldBase & { type: "button"; action: string; click: () => void | Promise<void> })
  | { key: string; type: "hidden"; default: any };

export interface SectionDef {
  id: string;
  title: string;
  desc?: string;
  fields: FieldDef[];
}

function validateRegex(value: string) {
  try {
    new RegExp(value);
    return null;
  } catch (e) {
    return "Некорректное регулярное выражение";
  }
}

function validateTemplate(argName: string) {
  return (value: string) => {
    try {
      new Function(argName, "return " + value);
      return null;
    } catch (e) {
      return "Некорректное JS-выражение";
    }
  };
}

const TEMPLATE_WARNING =
  "Внутри может выполняться любой код, поэтому используйте с осторожностью. " +
  "Гарантированно работает только на Tampermonkey.";

export function createSections(onRegister: () => void | Promise<void>): SectionDef[] {
  return [
    {
      id: "general",
      title: "Общие",
      fields: [
        {
          key: "summary",
          type: "checkbox",
          default: true,
          title: "Суммарный рейтинг",
          desc: "Показывать общий рейтинг у постов и комментариев.",
        },
        {
          key: "minRatesCountToShowRatingBar",
          type: "int",
          default: 3,
          title: "Минимум оценок для шкалы",
          desc: "Сколько оценок должно быть у поста или комментария, чтобы показать соотношение плюсов и минусов. 0 — показывать всегда.",
        },
        {
          key: "noLinkTracking",
          type: "checkbox",
          default: true,
          title: "Убирать трекеры из ссылок",
        },
      ],
    },
    {
      id: "stories",
      title: "Посты",
      fields: [
        {
          key: "minStoryRating",
          type: "int",
          default: 100,
          title: "Минимальный рейтинг поста",
          desc: "Посты с рейтингом ниже указанного будут удаляться из ленты. Их можно увидеть в списке просмотренных.",
        },
        {
          key: "ratingBar",
          type: "checkbox",
          default: true,
          title: "Шкала плюсов и минусов",
          desc: "Если у поста нет оценок, будет показано соотношение 1:1.",
        },
        {
          key: "storyCounters",
          type: "checkbox",
          default: true,
          title: "Счётчики плюсов и минусов",
        },
        {
          key: "showBlockAuthorForeverButton",
          type: "checkbox",
          default: true,
          title: "Кнопка «Заблокировать автора навсегда»",
          desc: "Добавляет автора в игнор-лист. Нужно быть авторизованным на сайте, иначе кнопка не работает.",
        },
        {
          key: "blockPaidAuthors",
          type: "checkbox",
          default: true,
          title: "Скрывать посты авторов с Пикабу+",
          desc: "Удаляет из ленты посты проплаченных авторов.",
        },
        {
          key: "videoDownloadButtons",
          type: "checkbox",
          default: true,
          title: "Ссылки на источники видео",
          desc: "Добавляет ко всем видео в постах ссылки на источники, если их удалось найти.",
        },
        {
          key: "socialLinks",
          type: "checkbox",
          default: false,
          title: "Значки соцсетей в заголовке",
          desc: "Добавляет значки Телеграма, ВК и Тиктока в начало заголовка, если в посте есть такие ссылки.",
        },
      ],
    },
    {
      id: "comments",
      title: "Комментарии",
      fields: [
        {
          key: "ratingBarComments",
          type: "checkbox",
          default: true,
          title: "Шкала плюсов и минусов",
        },
        {
          key: "commentCounters",
          type: "checkbox",
          default: true,
          title: "Счётчики плюсов и минусов",
        },
        {
          key: "commentVideoDownloadButtons",
          type: "checkbox",
          default: true,
          title: "Ссылки на источники видео",
          desc: "Добавляет ко всем видео в комментариях ссылки на источники, если их удалось найти.",
        },
        {
          key: "unrollCommentaries",
          type: "select",
          default: SettingEnums.UnrollComments.NONE,
          options: [
            SettingEnums.UnrollComments.NONE,
            SettingEnums.UnrollComments.UNROLL_ALL_BUTTON,
            SettingEnums.UnrollComments.AUTO_UNROLL,
          ],
          title: "Раскрытие веток комментариев",
        },
        // DEPRECATED: migrated to unrollCommentaries
        { key: "unrollCommentariesAutomatically", type: "hidden", default: undefined },
      ],
    },
    {
      id: "tabs",
      title: "Вкладки Пикабу",
      desc: "Включает и выключает вкладки сверху. Работает только на ПК.",
      fields: [
        { key: "hotTab", type: "checkbox", default: true, title: "Горячее" },
        { key: "bestTab", type: "checkbox", default: true, title: "Лучшее" },
        { key: "newTab", type: "checkbox", default: true, title: "Свежее" },
        { key: "subsTab", type: "checkbox", default: true, title: "Подписки" },
        { key: "communitiesTab", type: "checkbox", default: true, title: "Сообщества" },
        { key: "blogsTab", type: "checkbox", default: true, title: "Блоги" },
        { key: "expertsTab", type: "checkbox", default: true, title: "Эксперты" },
      ],
    },
    {
      id: "rpm",
      title: "RPM",
      desc: "Дополнительные функции скрипта. Используется сервер rpm.pyxiion.ru.",
      fields: [
        {
          key: "rpmEnabled",
          type: "checkbox",
          default: true,
          title: "Рейтинг авторов у постов",
        },
        {
          key: "rpmMinStoryRating",
          type: "int",
          default: 0,
          title: "Минимальный рейтинг автора",
          desc: "Если рейтинг автора в системе RPM меньше этого значения, его посты будут удалены из ленты.",
        },
        {
          key: "rpmIgnoreDownvoted",
          type: "checkbox",
          default: true,
          title: "Скрывать посты авторов с вашим минусом",
          desc: "Работает как игнор-лист.",
        },
        {
          key: "rpmComments",
          type: "checkbox",
          default: true,
          title: "Рейтинг авторов у комментариев",
        },
        {
          key: "rpmStoryVoteReason",
          type: "checkbox",
          default: true,
          title: "Показывать причину вашей оценки",
          desc: "Причина (если она есть) отображается в начале поста.",
        },
        {
          key: "registerRpm",
          type: "button",
          title: "Регистрация в RPM",
          action: "Зарегистрироваться",
          desc: "Нужна, чтобы оценивать авторов. После регистрации страница перезагрузится.",
          click: onRegister,
        },
        { key: "uuid", type: "hidden", default: "" },
      ],
    },
    {
      id: "mini-profile",
      title: "Мини-профили",
      desc: "Дополнения в мини-профиле пользователя, который появляется при наведении на ник.",
      fields: [
        {
          key: "miniProfileEditableNote",
          type: "checkbox",
          default: true,
          title: "Заметка о пользователе",
          desc: "Редактируемая заметка, которую видите только вы.",
        },
        {
          key: "miniProfileStoryTags",
          type: "checkbox",
          default: true,
          title: "Основные теги постов пользователя",
        },
        {
          key: "miniProfile\u0421ommentTags",
          type: "checkbox",
          default: true,
          title: "Теги постов, которые комментирует пользователь",
        },
        {
          key: "miniProfile\u0421omments",
          type: "checkbox",
          default: false,
          title: "Последние комментарии пользователя",
        },
        {
          key: "miniProfileAutoloadTags",
          type: "checkbox",
          default: false,
          title: "Автозагрузка тегов",
        },
        {
          key: "miniProfileAutoloadComments",
          type: "checkbox",
          default: false,
          title: "Автозагрузка последних комментариев",
        },
        {
          key: "miniProfileAutoloadPikabuCommentCount",
          type: "number",
          default: 1,
          title: "Сколько комментариев загружать сразу",
          desc: "Остальные подгружаются по кнопке «Загрузить».",
        },
        {
          key: "miniProfileOrientation",
          type: "select",
          default: SettingEnums.MiniProfileFeaturesOrientation.HORIZONTAL,
          options: [
            SettingEnums.MiniProfileFeaturesOrientation.HORIZONTAL,
            SettingEnums.MiniProfileFeaturesOrientation.VERTICAL,
          ],
          title: "Расположение блоков",
        },
      ],
    },
    {
      id: "profile",
      title: "Профили",
      desc: "То же самое, но на странице профиля пользователя.",
      fields: [
        {
          key: "profileStoryTags",
          type: "checkbox",
          default: true,
          title: "Основные теги постов пользователя",
        },
        {
          key: "profile\u0421ommentTags",
          type: "checkbox",
          default: true,
          title: "Теги постов, которые комментирует пользователь",
        },
        {
          key: "profile\u0421omments",
          type: "checkbox",
          default: true,
          title: "Последние комментарии пользователя",
        },
        {
          key: "profileAutoloadComments",
          type: "checkbox",
          default: true,
          title: "Автозагрузка последних комментариев",
        },
        {
          key: "profileAutoloadPikabuCommentCount",
          type: "number",
          default: 3,
          title: "Сколько комментариев загружать сразу",
          desc: "Остальные подгружаются по кнопке «Загрузить».",
        },
      ],
    },
    {
      id: "advanced",
      title: "Продвинутые",
      fields: [
        {
          key: "filteringPageRegex",
          type: "text",
          default:
            "^https?:\\/\\/pikabu.ru\\/(|best|companies|browse|disputed|most-saved)$",
          title: "Страницы с фильтрацией по рейтингу",
          desc: "Регулярное выражение, которому должен соответствовать адрес страницы.",
          validate: validateRegex,
        },
        {
          key: "minusesPattern",
          type: "text",
          default: "story.minuses",
          title: "Шаблон минусов у постов",
          desc:
            "JS-выражение. Пример: `story.minuses * 5000`. story: {id, rating, pluses, minuses}. " +
            TEMPLATE_WARNING,
          validate: validateTemplate("story"),
        },
        {
          key: "minusesCommentPattern",
          type: "text",
          default: "comment.minuses",
          title: "Шаблон минусов у комментариев",
          desc: "JS-выражение. Пример: `comment.minuses * 5000`. comment: {id, rating, pluses, minuses}.",
          validate: validateTemplate("comment"),
        },
        {
          key: "ownCommentPattern",
          type: "text",
          default:
            "comment.pluses == 0 && comment.minuses == 0 ? 0 : comment.pluses == comment.minuses ? `+${comment.pluses} / -${comment.minuses}` : comment.pluses == 0 ? `-${comment.minuses}` : comment.minuses == 0 ? `+${comment.pluses}` : `+${comment.pluses} / ${comment.rating} / -${comment.minuses}`",
          title: "Шаблон рейтинга у ваших комментариев",
          desc: "JS-выражение. comment: {id, rating, pluses, minuses}.",
          validate: validateTemplate("comment"),
        },
        {
          key: "debug",
          type: "checkbox",
          default: false,
          title: "Отладочные логи",
          desc: "Выводит дополнительные сообщения в консоль. Для разработки и отладки.",
        },
      ],
    },
  ];
}
