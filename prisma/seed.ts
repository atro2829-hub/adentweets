import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await db.like.deleteMany();
  await db.retweet.deleteMany();
  await db.bookmark.deleteMany();
  await db.postHashtag.deleteMany();
  await db.hashtag.deleteMany();
  await db.notification.deleteMany();
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.comment.deleteMany();
  await db.follow.deleteMany();
  await db.block.deleteMany();
  await db.mute.deleteMany();
  await db.post.deleteMany();
  await db.user.deleteMany();

  const password = await bcrypt.hash('password123', 10);

  // Create users
  const users = await Promise.all([
    db.user.create({
      data: {
        email: 'ahmed@adentweets.com',
        password,
        username: 'ahmed_ali',
        fullName: 'أحمد علي',
        bio: 'مطور ويب | عدن 🇾🇪 | أحب التقنية والبرمجة',
        location: 'عدن، اليمن',
        website: 'https://ahmedali.dev',
        isVerified: true,
        followersCount: 1250,
        followingCount: 320,
        postsCount: 156,
      },
    }),
    db.user.create({
      data: {
        email: 'sara@adentweets.com',
        password,
        username: 'sara_mohammed',
        fullName: 'سارة محمد',
        bio: 'مصممة جرافيك | فن وتصميم ✨',
        location: 'صنعاء، اليمن',
        isVerified: true,
        followersCount: 890,
        followingCount: 210,
        postsCount: 89,
      },
    }),
    db.user.create({
      data: {
        email: 'khalid@adentweets.com',
        password,
        username: 'khalid_omar',
        fullName: 'خالد عمر',
        bio: 'صحفي مستقل | كتابة وتحقيق',
        location: 'عدن، اليمن',
        followersCount: 560,
        followingCount: 180,
        postsCount: 234,
      },
    }),
    db.user.create({
      data: {
        email: 'fatima@adentweets.com',
        password,
        username: 'fatima_hassan',
        fullName: 'فاطمة حسن',
        bio: 'طبيبة | صحة المجتمع 💊',
        location: 'تعز، اليمن',
        followersCount: 430,
        followingCount: 95,
        postsCount: 67,
      },
    }),
    db.user.create({
      data: {
        email: 'youssef@adentweets.com',
        password,
        username: 'youssef_saeed',
        fullName: 'يوسف سعيد',
        bio: 'رائد أعمال | تقنية ناشئة 🚀',
        location: 'عدن، اليمن',
        followersCount: 780,
        followingCount: 145,
        postsCount: 112,
      },
    }),
    db.user.create({
      data: {
        email: 'nadia@adentweets.com',
        password,
        username: 'nadia_ahmed',
        fullName: 'نادية أحمد',
        bio: 'معلمة | تعليم وتربية 📚',
        location: 'عدن، اليمن',
        followersCount: 320,
        followingCount: 278,
        postsCount: 45,
      },
    }),
    db.user.create({
      data: {
        email: 'omar@adentweets.com',
        password,
        username: 'omar_khalid',
        fullName: 'عمر خالد',
        bio: 'مصور فوتوغرافي | عدسة وسط الحدث 📷',
        location: 'المكلا، اليمن',
        followersCount: 1100,
        followingCount: 88,
        postsCount: 198,
      },
    }),
    db.user.create({
      data: {
        email: 'lama@adentweets.com',
        password,
        username: 'lama_saleh',
        fullName: 'لمى صالح',
        bio: 'كاتبة وشاعرة | كلمة تنير دربًا ✍️',
        location: 'عدن، اليمن',
        isVerified: true,
        followersCount: 2100,
        followingCount: 56,
        postsCount: 312,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create follows
  const followPairs = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 7],
    [1, 0], [1, 3], [1, 6], [1, 7],
    [2, 0], [2, 4], [2, 5], [2, 6],
    [3, 1], [3, 4], [3, 7],
    [4, 0], [4, 2], [4, 6], [4, 7],
    [5, 0], [5, 1], [5, 3], [5, 7],
    [6, 0], [6, 1], [6, 7],
    [7, 0], [7, 1], [7, 3], [7, 5],
  ];

  for (const [followerIdx, followingIdx] of followPairs) {
    await db.follow.create({
      data: {
        followerId: users[followerIdx].id,
        followingId: users[followingIdx].id,
      },
    });
  }
  console.log(`✅ Created ${followPairs.length} follows`);

  // Create posts with Arabic content
  const postsData = [
    { userId: 0, content: 'اليوم يوم جميل في عدن! الطقس رائع والجو مناسب للخروج في نزهة على البحر 🌊 #عدن #اليمن', hours: 1 },
    { userId: 1, content: 'أنهيت تصميم شعار جديد لعميل من السعودية. التصميم يجمع بين الأصالة والحداثة ✨ #تصميم #جرافيك', hours: 2 },
    { userId: 2, content: 'تقرير مهم: الوضع الإنساني في اليمن يتطلب اهتمامًا دوليًا متجددًا. المجتمع المدني يقوم بدور كبير في تقديم المساعدات.', hours: 3 },
    { userId: 3, content: 'نصيحة طبية: اشرب الماء بانتظام خاصة في الجو الحار. الجسم يحتاج إلى ٨ أكواب يوميًا على الأقل 💧 #صحة #نصائح_طبية', hours: 4 },
    { userId: 4, content: 'أعلن عن إطلاق تطبيقنا الجديد الأسبوع القادم! تطبيق يساعد رواد الأعمال في إدارة مشاريعهم بسهولة 🚀 #ريادة_أعمال #تقنية', hours: 5 },
    { userId: 5, content: 'اليوم العالمي للمعلم! تحية لكل معلم ومعلمة يضحون من أجل مستقبل أجيالنا 📚 #يوم_المعلم_العالمي #تعليم', hours: 6 },
    { userId: 6, content: 'التقطت هذه الصورة الرائعة لغروب الشمس في المكلا. الطبيعة اليمنية ساحرة حقًا 📷 #تصوير #المكلا #طبيعة', hours: 8 },
    { userId: 7, content: 'كتبت قصيدة جديدة بعنوان "أمل في الظلام". سأنشرها قريبًا في ديواني الجديد. الشعر هو صوت الروح ✍️ #شعر #أدب #يمن', hours: 10 },
    { userId: 0, content: 'تعلمت تقنية جديدة اليوم: WebSocket للاتصال الحقيقي. البرمجة عالم لا ينتهي من الإبداع 💻 #برمجة #تقنية #ويب', hours: 12 },
    { userId: 1, content: 'شاركت في ورشة عمل عن تصميم تجربة المستخدم. التعلم المستمر هو مفتاح النجاح في هذا المجال 🎨 #UX #تصميم', hours: 14 },
    { userId: 2, content: 'لقاء صحفي مهم اليوم مع مسؤول حكومي حول تطوير البنية التحتية في عدن. سننشر التفاصيل قريبًا 📰', hours: 16 },
    { userId: 4, content: 'نصيحة لرواد الأعمال: لا تخف من الفشل. كل فشل هو درس يقربك من النجاح. استمر في المحاولة! 💪 #ريادة #تحفيز', hours: 18 },
    { userId: 6, content: 'معرض الصور الجديد متاح الآن على موقعي. صور من مختلف محافظات اليمن تروي جمال هذا البلد 🏞️ #تصوير_فوتوغرافي #اليمن', hours: 20 },
    { userId: 7, content: '"وفي الظلام يولد النور، وفي الألم يولد الأمل، وفي الصبر يولد الفرج" - خاطرة يومية ✍️ #خواطر #أدب', hours: 22 },
    { userId: 3, content: 'حملة توعية جديدة عن أهمية التطعيمات للأطفال. الوقاية خير من العلاج. لنتعاون لحماية أطفالنا 💉 #توعية #صحة_الأطفال', hours: 24 },
    { userId: 0, content: 'مشروع مفتوح المصدر جديد! عملت مع فريق رائع على أداة تساعد المطورين العرب. المساهمة مفتوحة للجميع 🌍 #مفتوح_المصدر #مطورون_عرب', hours: 30 },
    { userId: 5, content: 'بدأ العام الدراسي الجديد. أتمنى لجميع الطلاب والطالبات عامًا دراسيًا ناجحًا ومليئًا بالإنجازات 🎒 #عام_دراسي #تعليم', hours: 36 },
    { userId: 2, content: 'الصحافة المكتوبة لا تموت. رغم التحول الرقمي، لا شيء ي replace عمق التحقيق الصحفي المكتوب 📝 #صحافة #إعلام', hours: 42 },
    { userId: 1, content: 'الحمد لله وصلت إلى ١٠٠٠ متابع! شكرًا لكل من دعمني في رحلتي في التصميم. هذا فقط البداية 🎉 #شكرا #تصميم_جرافيك', hours: 48 },
    { userId: 7, content: 'القراءة غذاء العقل. أنهيت هذا الأسبوع ثلاثة كتب رائعة. ما هو آخر كتاب قرأته؟ 📖 #قراءة #كتب #ثقافة', hours: 54 },
  ];

  const posts = [];
  for (const pd of postsData) {
    const createdAt = new Date(Date.now() - pd.hours * 60 * 60 * 1000);
    const post = await db.post.create({
      data: {
        userId: users[pd.userId].id,
        content: pd.content,
        createdAt,
        updatedAt: createdAt,
      },
    });
    posts.push(post);

    // Extract and create hashtags
    const hashtagMatches = pd.content.match(/#([\u0600-\u06FFa-zA-Z0-9_]+)/g) || [];
    for (const tag of hashtagMatches) {
      const tagText = tag.slice(1);
      const hashtag = await db.hashtag.upsert({
        where: { tag: tagText },
        create: { tag: tagText, usageCount: 1 },
        update: { usageCount: { increment: 1 } },
      });
      await db.postHashtag.create({
        data: { postId: post.id, hashtagId: hashtag.id },
      });
    }
  }

  console.log(`✅ Created ${posts.length} posts`);

  // Create some comments
  const commentsData = [
    { postId: 0, userId: 1, content: 'صور رائعة! أتمنى أزور عدن قريبًا 🌊' },
    { postId: 0, userId: 4, content: 'عدن جميلة جدًا. الطقس هناك لا مثيل له' },
    { postId: 1, userId: 0, content: 'تصميم رائع سارة! أحب أسلوبك في الدمج بين الأصالة والحداثة' },
    { postId: 3, userId: 5, content: 'نصيحة مهمة جدًا. شكرًا دكتورة فاطمة' },
    { postId: 4, userId: 0, content: 'مبروك يوسف! بالتوفيق في الإطلاق 🚀' },
    { postId: 4, userId: 2, content: 'مبادرة رائعة. تحتاجها السوق اليمنية' },
    { postId: 6, userId: 7, content: 'صورة خلابة! المكلا أرض السحر والجمال' },
    { postId: 7, userId: 5, content: 'في انتظار الديوان الجديد بشوق يا لمى ✍️' },
    { postId: 8, userId: 4, content: 'WebSocket تقنية قوية. نستخدمها في تطبيقنا أيضًا' },
    { postId: 14, userId: 3, content: 'حملة مهمة جدًا. التطعيمات تنقذ حياة الأطفال' },
  ];

  for (const cd of commentsData) {
    const createdAt = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    await db.comment.create({
      data: {
        postId: posts[cd.postId].id,
        userId: users[cd.userId].id,
        content: cd.content,
        createdAt,
      },
    });
    // Increment comment count
    await db.post.update({
      where: { id: posts[cd.postId].id },
      data: { commentsCount: { increment: 1 } },
    });
  }

  console.log(`✅ Created ${commentsData.length} comments`);

  // Create likes
  const likePairs = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
    [1, 0], [1, 2], [1, 4], [1, 6], [1, 8],
    [2, 0], [2, 3], [2, 4], [2, 6], [2, 7],
    [3, 0], [3, 1], [3, 5], [3, 7],
    [4, 0], [4, 2], [4, 3], [4, 6],
    [5, 0], [5, 3], [5, 6], [5, 7],
    [6, 0], [6, 1], [6, 4], [6, 7],
    [7, 0], [7, 2], [7, 3], [7, 4], [7, 5],
  ];

  for (const [userIdx, postIdx] of likePairs) {
    if (postIdx < posts.length) {
      await db.like.create({
        data: {
          userId: users[userIdx].id,
          postId: posts[postIdx].id,
        },
      });
      await db.post.update({
        where: { id: posts[postIdx].id },
        data: { likesCount: { increment: 1 } },
      });
    }
  }

  console.log(`✅ Created ${likePairs.length} likes`);

  // Create retweets
  const retweetPairs = [
    [1, 0], [3, 4], [5, 3], [6, 7], [7, 0],
  ];

  for (const [userIdx, postIdx] of retweetPairs) {
    if (postIdx < posts.length) {
      await db.retweet.create({
        data: {
          userId: users[userIdx].id,
          postId: posts[postIdx].id,
        },
      });
      await db.post.update({
        where: { id: posts[postIdx].id },
        data: { retweetsCount: { increment: 1 } },
      });
    }
  }

  console.log(`✅ Created ${retweetPairs.length} retweets`);

  // Create bookmarks
  await db.bookmark.createMany({
    data: [
      { userId: users[0].id, postId: posts[7].id },
      { userId: users[0].id, postId: posts[13].id },
      { userId: users[1].id, postId: posts[4].id },
    ],
  });

  console.log('✅ Created bookmarks');

  // Create notifications
  await db.notification.createMany({
    data: [
      { userId: users[0].id, actorId: users[1].id, type: 'like', postId: posts[0].id, isRead: false },
      { userId: users[0].id, actorId: users[4].id, type: 'like', postId: posts[0].id, isRead: false },
      { userId: users[0].id, actorId: users[1].id, type: 'comment', postId: posts[0].id, isRead: true },
      { userId: users[1].id, actorId: users[0].id, type: 'follow', isRead: false },
      { userId: users[4].id, actorId: users[0].id, type: 'like', postId: posts[4].id, isRead: true },
      { userId: users[3].id, actorId: users[5].id, type: 'comment', postId: posts[3].id, isRead: false },
      { userId: users[7].id, actorId: users[6].id, type: 'like', postId: posts[6].id, isRead: false },
      { userId: users[7].id, actorId: users[5].id, type: 'comment', postId: posts[7].id, isRead: true },
      { userId: users[0].id, actorId: users[7].id, type: 'retweet', postId: posts[0].id, isRead: false },
      { userId: users[2].id, actorId: users[4].id, type: 'follow', isRead: false },
    ],
  });

  console.log('✅ Created notifications');

  // Create a conversation and messages
  const conv = await db.conversation.create({
    data: {
      user1Id: users[0].id,
      user2Id: users[1].id,
    },
  });

  const messages = [
    'مرحبًا سارة! كيف حالك؟',
    'أهلاً أحمد! الحمد لله بخير، وأنت؟',
    'بخير الحمد لله. أردت أسألك عن تصميم الشعار الجديد',
    'نعم! هل أعجبك التصميم؟',
    'رائع جدًا! أحببت طريقة دمج الألوان',
    'شكرًا كثيرًا! عملت عليه طوال الأسبوع',
  ];

  for (let i = 0; i < messages.length; i++) {
    const createdAt = new Date(Date.now() - (messages.length - i) * 5 * 60 * 1000);
    await db.message.create({
      data: {
        senderId: i % 2 === 0 ? users[0].id : users[1].id,
        recipientId: i % 2 === 0 ? users[1].id : users[0].id,
        conversationId: conv.id,
        content: messages[i],
        isRead: i < messages.length - 1,
        createdAt,
      },
    });
  }

  console.log('✅ Created conversation with messages');
  console.log('\n🎉 Seeding complete!');
  console.log('\n📧 Test accounts:');
  console.log('  ahmed@adentweets.com / password123');
  console.log('  sara@adentweets.com / password123');
  console.log('  khalid@adentweets.com / password123');
  console.log('  fatima@adentweets.com / password123');
  console.log('  youssef@adentweets.com / password123');
  console.log('  nadia@adentweets.com / password123');
  console.log('  omar@adentweets.com / password123');
  console.log('  lama@adentweets.com / password123');
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect());