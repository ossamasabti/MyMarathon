class OwnedQuerysetMixin:
    """Restrict a view's queryset to the requesting user's rows.

    Models used with this mixin must have a `user` foreign key. Objects
    belonging to other users are never listed and resolve to 404.
    """

    owner_field = "user"

    def get_queryset(self):
        return super().get_queryset().filter(**{self.owner_field: self.request.user})

    def perform_create(self, serializer):
        serializer.save(**{self.owner_field: self.request.user})
