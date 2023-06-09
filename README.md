# App

Данный модуль приложения генерирует фековых клиентов при помощи библиотеки faker
и сохраняет их в монгу.

Параметры генерации настраиваются через .env по следующим полям

- FAKER_FILLING_DELAY_MS - мс между генерациями пачек
- FAKER_BATCH_MIN - минимальное количество клиентов в пачке
- FAKER_BATCH_MAX - максимальное количество клиентов в пачке

# Sync

Данное приложение занимается анонимизацией клиентов (сохраняет дубликаты в другую коллекцию, скрывая чувствительные данные)

Замена происходит следующим образом, берем строку которую хотим анонимизировать, хешируем ее по sha-256 и берем первые 8 символов.
Для email мы хешируем только часть до знака @

В модуле используется два механизма синхронизации
"сканирование" и RealTime(RT) синхронизация

Так же есть два способа запуска синхронизации:

- По стандарту синхронизация следит за изменениями в реальном времени
  и подтягивает их
- Сканирование, пробегает коллекцию от начала и до конца переливая/обновляя данные

## RT синхронизация работает следующим образом:

- В начале мы получаем последнего анонимизированного клиента
  и последнего не анонимизированного клиента
- проводим сканирование от первого ко второму пачками по 1000 штук
  (настраивается через env полем SYNC_BATCH_SIZE)
- когда завершили сканирование переключаемся в режим RTSync
  И слушаем изменения через механизм $changeStreams
- При редактировании клиента в исходной коллекции мы обновляем его и в анон.коллеции
- Когда мы получаем 1000 событий на insert мы запускаем маленькое сканирование от последнего анон.клиента до последнего клиента
- если прошло больше 1 секунды, а insert`ов меньше 1000, но они все равно были за это время, мы опять же запускаем сканирование
- От использования изменений приходящих на $changeStreams я отказался
  так как они приходят не в гарантированном порядке и при неожиданном выключении часть клиентов может потеряться. Например
  была вставка сразу из 4 клиентов.
  В $changeStreams мы успели получить 1, 3 и 4 клиента,
  мы их вставляем и вырубаемся, второго клиента получить не успели
  и при перезапуске мы не можем понять где мы потеряли клиента
  так что сканирование оказалось более надежным решением
  и мы не теряем пользователей. Так что отслеживаем inset`ы только для того что бы понять когда запускать сканирование что бы не спамить запросами

## Full Reindex

- Работает проще, просто запускается сканирование от начала и до конца коллекции, так же пачками по SYNC_BATCH_SIZE

### Пометки

- Мы можем прерывать работу, а потом запускать снова клиенты не теряются, даже с парралельной faker-генераций
- мы можем запускать несколько инстансов парралельно в одинаковых или разных режимах, они не конфликтуют между собой
- в режиме RTSync при неожиданном выключении и повторном запуске insert\`ы мы не теряем, а вот потерять update\`ы мы можем так как
  их мы обновляем исключительно через механизм $changeStreams. То есть update`ы совершенные во время выключенной синхронизации мы не подтянем,
  тут остается только режим full-reindex

# Требования

Синхронизация приложения использует $changeStreams,
а это значит что для корректной работы нужно что бы монга имела настроенную репликацию.
В локальной разработке я использовал реплику из одной ноды.

# Запуск

Проект использует typescript

Есть два способа запуска для каждого из модуля

- dev - Запуск TS без ручной комплияции проекта запуск происходит из папки src,
  так же логгер пишет расширенные debug логи
- prod - Запуск чистого JS из папки build,
  ожидается что проект перед этим был скомпилирован вручную, логи пишутся обычные

## Команды

- `npm run dev:app` - dev запуск app с расширенными логами
- `npm run dev:sync` - dev запуск синхронизации с расширенными логами
- `npm run dev:sync-full` - dev запуск full-reindex синхронизации с расширенными логами
- `npm run prod:app` - prod запуск app
- `npm run prod:sync` - prod запуск синхронизации
- `npm run prod:sync-full` - prod запуск full-reindex синхронизации
- `npm run format` - prettier форматирование всего проекта
- `npm run build` - компиляция TS из папки src в JS в папку build
