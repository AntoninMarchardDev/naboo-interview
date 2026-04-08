export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: string; output: string; }
};

export type Activity = {
  __typename?: 'Activity';
  city: Scalars['String']['output'];
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  owner: User;
  price: Scalars['Int']['output'];
};

export type AddToFavoriteInput = {
  activityId: Scalars['String']['input'];
};

export type CreateActivityInput = {
  city: Scalars['String']['input'];
  description: Scalars['String']['input'];
  name: Scalars['String']['input'];
  price: Scalars['Int']['input'];
};

export type Favorite = {
  __typename?: 'Favorite';
  activity: Activity;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  order: Scalars['Int']['output'];
  user: User;
};

export type Mutation = {
  __typename?: 'Mutation';
  addFavorite: Favorite;
  createActivity: Activity;
  login: SignInDto;
  logout: Scalars['Boolean']['output'];
  register: User;
  removeFavorite: Favorite;
};


export type MutationAddFavoriteArgs = {
  addToFavoriteInput: AddToFavoriteInput;
};


export type MutationCreateActivityArgs = {
  createActivityInput: CreateActivityInput;
};


export type MutationLoginArgs = {
  signInInput: SignInInput;
};


export type MutationRegisterArgs = {
  signUpInput: SignUpInput;
};


export type MutationRemoveFavoriteArgs = {
  removeFromFavoriteInput: RemoveFromFavoriteInput;
};

export type Query = {
  __typename?: 'Query';
  getActivities: Array<Activity>;
  getActivitiesByCity: Array<Activity>;
  getActivitiesByUser: Array<Activity>;
  getActivity: Activity;
  getCities: Array<Scalars['String']['output']>;
  getFavorites: Array<Favorite>;
  getLatestActivities: Array<Activity>;
  getMe: User;
};


export type QueryGetActivitiesByCityArgs = {
  activity?: InputMaybe<Scalars['String']['input']>;
  city: Scalars['String']['input'];
  price?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetActivityArgs = {
  id: Scalars['String']['input'];
};

export type RemoveFromFavoriteInput = {
  activityId: Scalars['String']['input'];
};

export type SignInDto = {
  __typename?: 'SignInDto';
  access_token: Scalars['String']['output'];
};

export type SignInInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type SignUpInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastName: Scalars['String']['output'];
};

export type ActivityFragment = { __typename?: 'Activity', id: string, city: string, description: string, name: string, price: number, owner: { __typename?: 'User', firstName: string, lastName: string } };

export type FavoriteFragment = { __typename?: 'Favorite', id: string, activity: { __typename?: 'Activity', id: string } };

export type OwnerFragment = { __typename?: 'User', firstName: string, lastName: string };

export type CreateActivityMutationVariables = Exact<{
  createActivityInput: CreateActivityInput;
}>;


export type CreateActivityMutation = { __typename?: 'Mutation', createActivity: { __typename?: 'Activity', id: string, city: string, description: string, name: string, price: number, owner: { __typename?: 'User', firstName: string, lastName: string } } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type SigninMutationVariables = Exact<{
  signInInput: SignInInput;
}>;


export type SigninMutation = { __typename?: 'Mutation', login: { __typename?: 'SignInDto', access_token: string } };

export type SignupMutationVariables = Exact<{
  signUpInput: SignUpInput;
}>;


export type SignupMutation = { __typename?: 'Mutation', register: { __typename?: 'User', id: string, email: string, firstName: string, lastName: string } };

export type AddToFavoriteMutationVariables = Exact<{
  addToFavoriteInput: AddToFavoriteInput;
}>;


export type AddToFavoriteMutation = { __typename?: 'Mutation', addFavorite: { __typename?: 'Favorite', id: string, activity: { __typename?: 'Activity', id: string } } };

export type RemoveFromFavoriteMutationVariables = Exact<{
  removeFromFavoriteInput: RemoveFromFavoriteInput;
}>;


export type RemoveFromFavoriteMutation = { __typename?: 'Mutation', removeFavorite: { __typename?: 'Favorite', id: string, activity: { __typename?: 'Activity', id: string } } };

export type GetActivitiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetActivitiesQuery = { __typename?: 'Query', getActivities: Array<{ __typename?: 'Activity', id: string, city: string, description: string, name: string, price: number, owner: { __typename?: 'User', firstName: string, lastName: string } }> };

export type GetActivitiesByCityQueryVariables = Exact<{
  activity?: InputMaybe<Scalars['String']['input']>;
  city: Scalars['String']['input'];
  price?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetActivitiesByCityQuery = { __typename?: 'Query', getActivitiesByCity: Array<{ __typename?: 'Activity', id: string, city: string, description: string, name: string, price: number, owner: { __typename?: 'User', firstName: string, lastName: string } }> };

export type GetActivityQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetActivityQuery = { __typename?: 'Query', getActivity: { __typename?: 'Activity', id: string, city: string, description: string, name: string, price: number, owner: { __typename?: 'User', firstName: string, lastName: string } } };

export type GetLatestActivitiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLatestActivitiesQuery = { __typename?: 'Query', getLatestActivities: Array<{ __typename?: 'Activity', id: string, city: string, description: string, name: string, price: number, owner: { __typename?: 'User', firstName: string, lastName: string } }> };

export type GetUserActivitiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserActivitiesQuery = { __typename?: 'Query', getActivitiesByUser: Array<{ __typename?: 'Activity', id: string, city: string, description: string, name: string, price: number, owner: { __typename?: 'User', firstName: string, lastName: string } }> };

export type GetUserQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserQuery = { __typename?: 'Query', getMe: { __typename?: 'User', id: string, firstName: string, lastName: string, email: string } };

export type GetCitiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCitiesQuery = { __typename?: 'Query', getCities: Array<string> };

export type GetFavoritesByUserQueryVariables = Exact<{ [key: string]: never; }>;


export type GetFavoritesByUserQuery = { __typename?: 'Query', getFavorites: Array<{ __typename?: 'Favorite', id: string, activity: { __typename?: 'Activity', id: string } }> };
